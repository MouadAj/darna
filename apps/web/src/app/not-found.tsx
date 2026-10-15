import {NotFoundPage} from '@/components/not-found-page';
import en from '../../messages/en.json';
import fr from '../../messages/fr.json';
import ar from '../../messages/ar.json';

export default function NotFound() {
  return <NotFoundPage messages={{en: en.notFound, fr: fr.notFound, ar: ar.notFound}}/>;
}
