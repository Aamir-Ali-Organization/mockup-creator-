import { z } from 'zod';
import {
  clearKnowledgeSessionCookie,
  createKnowledgeSessionToken,
  getKnowledgeSessionUser,
  knowledgeSessionCookie,
  validateKnowledgeCredentials,
} from '@/lib/knowledge-auth';
import { AppError, toErrorResponse } from '@/lib/errors';

export const runtime = 'nodejs';

const loginSchema = z.object({
  user: z.string().trim().min(1),
  password: z.string().min(1),
});

export async function GET(request: Request) {
  const user = getKnowledgeSessionUser(request);
  if (!user) {
    return Response.json({ success: false, authenticated: false }, { status: 401 });
  }
  return Response.json({ success: true, authenticated: true, user });
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = loginSchema.safeParse(json);
    if (!parsed.success) {
      throw new AppError('Email and password are required', 400);
    }

    const { user, password } = parsed.data;
    if (!validateKnowledgeCredentials(user, password)) {
      throw new AppError('Invalid email or password', 401);
    }

    const token = createKnowledgeSessionToken(user);
    return Response.json(
      { success: true, authenticated: true, user },
      {
        headers: {
          'Set-Cookie': knowledgeSessionCookie(token, request),
        },
      },
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  return Response.json(
    { success: true, authenticated: false },
    {
      headers: {
        'Set-Cookie': clearKnowledgeSessionCookie(request),
      },
    },
  );
}
