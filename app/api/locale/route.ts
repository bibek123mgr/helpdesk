import { NextResponse } from 'next/server'
import { locales } from '@/i18n/request'

export async function POST(request: Request) {
  const { locale } = await request.json()

  if (!locales.includes(locale)) {
    return NextResponse.json({ error: 'Unsupported locale' }, { status: 400 })
  }

  const response = NextResponse.json({ success: true })
  response.cookies.set('locale', locale, { maxAge: 60 * 60 * 24 * 365, path: '/' })
  return response
}