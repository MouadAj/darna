import Image from 'next/image';

export function BrandLogo({markOnly = false, className = ''}: {markOnly?: boolean; className?: string}) {
  return <span className={`brand-logo ${markOnly ? 'brand-logo--mark' : ''} ${className}`}>
    <Image src="/brand/housefamily-mark.png" width={48} height={48} alt={markOnly ? 'Darna' : ''} className="brand-logo-image"/>
    {!markOnly && <span className="brand-logo-name" dir="ltr">Darna</span>}
  </span>;
}
