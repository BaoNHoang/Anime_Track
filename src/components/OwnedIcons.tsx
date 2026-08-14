import type { ReactNode, SVGProps } from "react";

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, "children"> {
  size?: number | string;
  strokeWidth?: number | string;
}

function Icon({ size = 24, strokeWidth = 1.8, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    />
  );
}

type NamedIconProps = IconProps;

export const Accessibility = (props: NamedIconProps) => <Icon {...props}><circle cx="12" cy="4" r="2"/><path d="M5 8h14M12 8v5m0 0-4 7m4-7 4 7M8 10l4 3 4-3"/></Icon>;
export const BadgeCheck = (props: NamedIconProps) => <Icon {...props}><path d="m12 2 2.2 2 3-.1.8 2.9 2.5 1.7-1 2.8 1 2.8-2.5 1.7-.8 2.9-3-.1-2.2 2-2.2-2-3 .1-.8-2.9-2.5-1.7 1-2.8-1-2.8L6 6.8l.8-2.9 3 .1L12 2Z"/><path d="m8.5 12 2.2 2.2 4.8-5"/></Icon>;
export const Bell = (props: NamedIconProps) => <Icon {...props}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z"/><path d="M10 21h4"/></Icon>;
export const Check = (props: NamedIconProps) => <Icon {...props}><path d="m5 12.5 4.2 4.2L19 7"/></Icon>;
export const CheckCircle2 = (props: NamedIconProps) => <Icon {...props}><circle cx="12" cy="12" r="9"/><path d="m7.8 12.2 2.8 2.8 5.8-6"/></Icon>;
export const ChevronLeft = (props: NamedIconProps) => <Icon {...props}><path d="m14.5 5-7 7 7 7"/></Icon>;
export const ChevronRight = (props: NamedIconProps) => <Icon {...props}><path d="m9.5 5 7 7-7 7"/></Icon>;
export const ArrowUp = (props: NamedIconProps) => <Icon {...props}><path d="m6 10 6-6 6 6M12 4v16"/></Icon>;
export const ArrowDown = (props: NamedIconProps) => <Icon {...props}><path d="m6 14 6 6 6-6M12 20V4"/></Icon>;
export const Compass = (props: NamedIconProps) => <Icon {...props}><circle cx="12" cy="12" r="9"/><path d="m15.8 8.2-2.1 5.5-5.5 2.1 2.1-5.5 5.5-2.1Z"/></Icon>;
export const Database = (props: NamedIconProps) => <Icon {...props}><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v7c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12v7c0 1.7 3.6 3 8 3s8-1.3 8-3v-7"/></Icon>;
export const Download = (props: NamedIconProps) => <Icon {...props}><path d="M12 3v12m-4-4 4 4 4-4M5 20h14"/></Icon>;
export const ExternalLink = (props: NamedIconProps) => <Icon {...props}><path d="M13 5h6v6m0-6-8 8"/><path d="M17 14v5H5V7h5"/></Icon>;
export const Heart = (props: NamedIconProps) => <Icon {...props}><path d="M20.5 9.2c0 5.1-8.5 10-8.5 10s-8.5-4.9-8.5-10A4.7 4.7 0 0 1 12 6.4a4.7 4.7 0 0 1 8.5 2.8Z"/></Icon>;
export const GripVertical = (props: NamedIconProps) => <Icon {...props}><circle cx="9" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="9" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="9" cy="18" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="18" r="1" fill="currentColor" stroke="none"/></Icon>;
export const IdCard = (props: NamedIconProps) => <Icon {...props}><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8" cy="11" r="2"/><path d="M5.5 16c.6-1.5 1.4-2.2 2.5-2.2s1.9.7 2.5 2.2M14 10h4m-4 4h4"/></Icon>;
export const ImageUp = (props: NamedIconProps) => <Icon {...props}><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8" cy="9" r="1.5"/><path d="m4 17 4.5-4.5 3 3 2-2 3.5 3.5M17 11V5m-2 2 2-2 2 2"/></Icon>;
export const Info = (props: NamedIconProps) => <Icon {...props}><circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><circle cx="12" cy="7.5" r="1" fill="currentColor" stroke="none"/></Icon>;
export const KeyRound = (props: NamedIconProps) => <Icon {...props}><circle cx="8" cy="15" r="4"/><path d="m11 12 8-8m-3 3 2 2m-5 1 2 2"/></Icon>;
export const LayoutDashboard = (props: NamedIconProps) => <Icon {...props}><path d="M4 4h6v7H4V4Zm10 0h6v4h-6V4ZM4 15h6v5H4v-5Zm10-3h6v8h-6v-8Z"/></Icon>;
export const LibraryBig = (props: NamedIconProps) => <Icon {...props}><path d="M5 4h4v16H5V4Zm5 0h4v16h-4V4Zm5.5 1 3.5-1 3 15-3.5 1-3-15Z"/></Icon>;
export const LogIn = (props: NamedIconProps) => <Icon {...props}><path d="M10 4H5v16h5m3-4 4-4-4-4m-7 4h11"/></Icon>;
export const LogOut = (props: NamedIconProps) => <Icon {...props}><path d="M14 4h5v16h-5m-3-4-4-4 4-4m-4 4h11"/></Icon>;
export const MailCheck = (props: NamedIconProps) => <Icon {...props}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6m-5 9 1.5 1.5L20 14"/></Icon>;
export const Map = (props: NamedIconProps) => <Icon {...props}><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Zm6-3v15m6-12v15"/></Icon>;
export const MessageCircle = (props: NamedIconProps) => <Icon {...props}><path d="M20 11.5a8 8 0 0 1-9.2 7.9L5 21l1.6-4.2A8 8 0 1 1 20 11.5Z"/></Icon>;
export const MessageSquare = (props: NamedIconProps) => <Icon {...props}><path d="M4 4h16v13H9l-5 4V4Z"/></Icon>;
export const Moon = (props: NamedIconProps) => <Icon {...props}><path d="M19.5 15.5A8 8 0 0 1 8.5 4.5a8 8 0 1 0 11 11Z"/></Icon>;
export const Newspaper = (props: NamedIconProps) => <Icon {...props}><path d="M5 4h14v16H5a2 2 0 0 1-2-2V7h2"/><path d="M8 8h8m-8 4h3m2 0h3m-8 4h3m2 0h3"/></Icon>;
export const Play = (props: NamedIconProps) => <Icon {...props}><path d="m8 5 11 7-11 7V5Z"/></Icon>;
export const PlayCircle = (props: NamedIconProps) => <Icon {...props}><circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4V8Z"/></Icon>;
export const Plus = (props: NamedIconProps) => <Icon {...props}><path d="M12 5v14M5 12h14"/></Icon>;
export const RefreshCw = (props: NamedIconProps) => <Icon {...props}><path d="M19 8V4l-2 2a8 8 0 1 0 2.2 8"/><path d="M15 4h4v4"/></Icon>;
export const Scale = (props: NamedIconProps) => <Icon {...props}><path d="M12 3v17M7 21h10M5 6h14M5 6l-3 6h6L5 6Zm14 0-3 6h6l-3-6Z"/></Icon>;
export const Search = (props: NamedIconProps) => <Icon {...props}><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></Icon>;
export const Settings2 = (props: NamedIconProps) => <Icon {...props}><path d="M4 7h6m4 0h6M4 17h10m4 0h2"/><circle cx="12" cy="7" r="2"/><circle cx="16" cy="17" r="2"/></Icon>;
export const ShieldCheck = (props: NamedIconProps) => <Icon {...props}><path d="M12 3 4.5 6v5.5c0 4.5 3 7.7 7.5 9.5 4.5-1.8 7.5-5 7.5-9.5V6L12 3Z"/><path d="m8.5 12 2.2 2.2 4.8-5"/></Icon>;
export const SlidersHorizontal = (props: NamedIconProps) => <Icon {...props}><path d="M4 7h4m4 0h8M4 17h9m4 0h3"/><circle cx="10" cy="7" r="2"/><circle cx="15" cy="17" r="2"/></Icon>;
export const Smartphone = (props: NamedIconProps) => <Icon {...props}><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M10 5h4m-3 14h2"/></Icon>;
export const Star = (props: NamedIconProps) => <Icon {...props}><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z"/></Icon>;
export const Sun = (props: NamedIconProps) => <Icon {...props}><circle cx="12" cy="12" r="4"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M19 5l-2 2M7 17l-2 2"/></Icon>;
export const Trash2 = (props: NamedIconProps) => <Icon {...props}><path d="M4 7h16M9 7V4h6v3m3 0-1 14H7L6 7m4 4v6m4-6v6"/></Icon>;
export const Upload = (props: NamedIconProps) => <Icon {...props}><path d="M12 16V4m-4 4 4-4 4 4M5 20h14"/></Icon>;
export const UserPlus = (props: NamedIconProps) => <Icon {...props}><circle cx="9" cy="8" r="4"/><path d="M2.5 21c.7-4 2.9-6 6.5-6s5.8 2 6.5 6M18 8v6m-3-3h6"/></Icon>;
export const UserRound = (props: NamedIconProps) => <Icon {...props}><circle cx="12" cy="8" r="4"/><path d="M4.5 21c.8-4 3.3-6 7.5-6s6.7 2 7.5 6"/></Icon>;
export const X = (props: NamedIconProps) => <Icon {...props}><path d="m5 5 14 14M19 5 5 19"/></Icon>;

export const Shuffle = (props: NamedIconProps) => <Icon {...props}><path d="M4 7h3c4.5 0 5.5 10 10 10h3m-3-3 3 3-3 3M4 17h3c1.4 0 2.5-1 3.5-2.4M17 4l3 3-3 3m3-3h-3c-1.4 0-2.5 1-3.5 2.4"/></Icon>;

export function BanimeMark(props: NamedIconProps) {
  return (
    <Icon {...props} viewBox="0 0 32 32" strokeWidth={props.strokeWidth ?? 2}>
      <path d="M7 5h11.5L25 11.5V27H7V5Z" />
      <path d="M18.5 5v6.5H25M12 11h5a3 3 0 0 1 0 6h-5v-6Zm0 6h5.5a3 3 0 0 1 0 6H12v-6Z" />
    </Icon>
  );
}
