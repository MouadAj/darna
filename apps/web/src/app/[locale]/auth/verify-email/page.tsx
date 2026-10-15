import {redirect} from 'next/navigation';

// Keep old bookmarks and confirmation links usable after email confirmation was removed.
export default async function LegacyEmailPage({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  redirect(`/${locale}/login`);
}
