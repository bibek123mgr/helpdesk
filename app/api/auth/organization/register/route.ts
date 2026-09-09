import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  const body = await request.json();
  const { name, email, password } = body;

  // Perform registration logic here (e.g., save to database)
  // For demonstration purposes, we'll just return the received data

  return new Response(JSON.stringify({ name, email }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
}