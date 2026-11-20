import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/store';
import { SkillItem } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const skills = db.getSkills();
  return NextResponse.json({
    success: true,
    totalSkills: skills.length,
    activeSkills: skills.filter((s) => s.isEnabled).length,
    skills,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, id, name, slug, description, tags, content, isEnabled } = body;

    if (action === 'toggle' && id !== undefined) {
      const success = db.toggleSkill(id, Boolean(isEnabled));
      return NextResponse.json({ success, id, isEnabled: Boolean(isEnabled) });
    }

    if (action === 'delete' && id) {
      const success = db.deleteSkill(id);
      return NextResponse.json({ success, deletedId: id });
    }

    if (action === 'reset') {
      const defaultSkills = db.resetSkillsToDefault();
      return NextResponse.json({ success: true, skills: defaultSkills });
    }

    if (action === 'save') {
      if (!name || !content) {
        return NextResponse.json(
          { success: false, error: 'Nama skill dan isi Markdown instruksi wajib diisi.' },
          { status: 400 }
        );
      }

      const generatedSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const existing = db.getSkill(id || generatedSlug);

      const skillRecord: SkillItem = {
        id: id || `skill_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name,
        slug: generatedSlug,
        description: description || '',
        tags: Array.isArray(tags) ? tags : typeof tags === 'string' ? tags.split(',').map((t: string) => t.trim()) : [],
        content,
        isEnabled: isEnabled !== undefined ? Boolean(isEnabled) : true,
        isBuiltIn: existing?.isBuiltIn || false,
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      db.saveSkill(skillRecord);
      return NextResponse.json({ success: true, skill: skillRecord });
    }

    return NextResponse.json({ success: false, error: 'Aksi tidak valid.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

