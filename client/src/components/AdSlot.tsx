import React, { useEffect, useRef } from 'react';

type Props = {
  slot?: string;
  style?: React.CSSProperties;
  format?: string;
};

export function AdSlot({ slot = 'auto', style, format = 'auto' }: Props) {
  const ref = useRef<HTMLModElement>(null);
  useEffect(() => {
    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {}
  }, []);
  return (
    <ins
      className="adsbygoogle"
      style={style || { display: 'block' }}
      data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
      data-ad-slot={slot}
      data-ad-format={format}
    />
  );
}



