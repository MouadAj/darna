import Image from 'next/image';

export function BrandLogo({markOnly = false, className = ''}: {markOnly?: boolean; className?: string}) {
  return <span className={`brand-logo ${markOnly ? 'brand-logo--mark' : ''} ${className}`}>
    <Image src="/brand/housefamily-mark.png" width={48} height={48} alt={markOnly ? 'HouseFamily' : ''} className="brand-logo-image"/>
    {!markOnly && <span className="brand-logo-name" dir="ltr">HouseFamily</span>}
  </span>;
}
