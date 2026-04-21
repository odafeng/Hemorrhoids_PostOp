// Lucide-style stroke icons (24x24, stroke=currentColor, stroke-width=1.75)
// Ported from UI_template/icons.jsx

const base = {
  width: 24, height: 24, viewBox: '0 0 24 24',
  fill: 'none', stroke: 'currentColor',
  strokeWidth: 1.75, strokeLinecap: 'round', strokeLinejoin: 'round',
};

function makeIcon(paths) {
  return function Icon(props) {
    return (
      <svg {...base} {...props}>
        {paths.map((d, i) => <path key={i} d={d} />)}
      </svg>
    );
  };
}

export const Home = makeIcon(['M3 10.5 12 3l9 7.5', 'M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5']);
export const Clipboard = makeIcon(['M9 4h6a1 1 0 0 1 1 1v2H8V5a1 1 0 0 1 1-1Z', 'M16 6h2a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h2', 'M9 13h6', 'M9 17h4']);
export const Chart = makeIcon(['M3 3v18h18', 'M7 15l3-4 3 3 5-6']);
export const Message = makeIcon(['M21 12a8 8 0 1 1-3.5-6.6L21 4l-1 4A8 8 0 0 1 21 12Z', 'M8 11h8', 'M8 14h5']);
export const Sun = makeIcon(['M12 4V2', 'M12 22v-2', 'M4.9 4.9 3.5 3.5', 'M20.5 20.5l-1.4-1.4', 'M2 12H4', 'M20 12h2', 'M4.9 19.1 3.5 20.5', 'M20.5 3.5l-1.4 1.4', 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z']);
export const Moon = makeIcon(['M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z']);
export const Settings = makeIcon(['M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z', 'M19.4 15a1.5 1.5 0 0 0 .3 1.7l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.5 1.5 0 0 0-1.7-.3 1.5 1.5 0 0 0-.9 1.4V21a2 2 0 0 1-4 0v-.1a1.5 1.5 0 0 0-1-1.4 1.5 1.5 0 0 0-1.7.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.5 1.5 0 0 0 .3-1.7 1.5 1.5 0 0 0-1.4-.9H3a2 2 0 0 1 0-4h.1a1.5 1.5 0 0 0 1.4-1 1.5 1.5 0 0 0-.3-1.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.5 1.5 0 0 0 1.7.3H9a1.5 1.5 0 0 0 .9-1.4V3a2 2 0 0 1 4 0v.1a1.5 1.5 0 0 0 .9 1.4 1.5 1.5 0 0 0 1.7-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.5 1.5 0 0 0-.3 1.7V9a1.5 1.5 0 0 0 1.4.9H21a2 2 0 0 1 0 4h-.1a1.5 1.5 0 0 0-1.4.9Z']);
export const LogOut = makeIcon(['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'm16 17 5-5-5-5', 'M21 12H9']);
export const Refresh = makeIcon(['M21 12a9 9 0 1 1-3-6.7L21 8', 'M21 3v5h-5']);
export const Alert = makeIcon(['M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z', 'M12 9v4', 'M12 17h0']);
export const Bell = makeIcon(['M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9', 'M13.7 21a2 2 0 0 1-3.4 0']);
export const Check = makeIcon(['M20 6 9 17l-5-5']);
export const ArrowLeft = makeIcon(['M19 12H5', 'M12 19l-7-7 7-7']);
export const Send = makeIcon(['m22 2-7 20-4-9-9-4Z', 'M22 2 11 13']);
export const Sparkle = makeIcon(['M12 3v4', 'M12 17v4', 'M3 12h4', 'M17 12h4', 'm5.6 5.6 2.8 2.8', 'm15.6 15.6 2.8 2.8', 'm5.6 18.4 2.8-2.8', 'm15.6 8.4 2.8-2.8']);
export const Shield = makeIcon(['M12 3 4 6v6c0 5 3.5 8.5 8 9 4.5-.5 8-4 8-9V6l-8-3Z']);
export const Edit = makeIcon(['M11 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5', 'm18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5Z']);
export const User = makeIcon(['M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2', 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z']);
export const Close = makeIcon(['m6 6 12 12', 'm6 18 12-12']);
export const Chevron = makeIcon(['m9 6 6 6-6 6']);
export const Info = makeIcon(['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M12 16v-4', 'M12 8h0']);
export const Search = makeIcon(['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z', 'm21 21-4.3-4.3']);
export const Eye = makeIcon(['M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z']);
export const EyeOff = makeIcon(['M9.9 4.2A10 10 0 0 1 12 4c6.5 0 10 7 10 7a14.6 14.6 0 0 1-3 4.1', 'M6.6 6.6A14.6 14.6 0 0 0 2 12s3.5 7 10 7a10 10 0 0 0 4.8-1.2', 'M9.9 9.9a3 3 0 0 0 4.2 4.2', 'm2 2 20 20']);
