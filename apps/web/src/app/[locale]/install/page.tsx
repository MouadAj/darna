import {getTranslations} from 'next-intl/server';
import {InstallPage} from '@/components/install-page';

export async function generateMetadata({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  const t = await getTranslations({locale,namespace:'pwa'});
  return {title:t('link')};
}

export default function Page() { return <InstallPage/>; }
