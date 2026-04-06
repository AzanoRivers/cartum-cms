export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { runBootValidation } = await import('@/lib/boot/validate')
    await runBootValidation()
  }
}
