import type { SVGProps } from 'react';

type Props = SVGProps<SVGSVGElement>;

const Base = ({ children, ...props }: Props) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    {children}
  </svg>
);

export const PlusIcon = (props: Props) => (
  <Base {...props}><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></Base>
);

export const SendIcon = (props: Props) => (
  <Base {...props}><path d="M4.4 4.9 20 12 4.4 19.1l1.8-6.1L14 12 6.2 11z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></Base>
);

export const SearchIcon = (props: Props) => (
  <Base {...props}><circle cx="10.5" cy="10.5" r="5.5" stroke="currentColor" strokeWidth="1.8" /><path d="m15 15 4.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></Base>
);

export const LogoutIcon = (props: Props) => (
  <Base {...props}><path d="M10 5H6.8A1.8 1.8 0 0 0 5 6.8v10.4A1.8 1.8 0 0 0 6.8 19H10M14 8l4 4-4 4M18 12H9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></Base>
);

export const BackIcon = (props: Props) => (
  <Base {...props}><path d="m14.5 6-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></Base>
);

export const ChevronIcon = (props: Props) => (
  <Base {...props}><path d="m8 10 4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></Base>
);
