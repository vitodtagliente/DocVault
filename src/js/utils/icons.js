/**
 * Icon helper — wraps Font Awesome 6 Free solid icons.
 * Usage: icon('trash', 'w-4 h-4') returns an <i> tag sized to match
 * the Tailwind width/height class requested.
 */

const faMap = {
  home:         'fa-house',
  clock:        'fa-clock',
  folder:       'fa-folder',
  archive:      'fa-box-archive',
  cog:          'fa-gear',
  cloud:        'fa-cloud',
  plus:         'fa-plus',
  search:       'fa-magnifying-glass',
  filter:       'fa-filter',
  upload:       'fa-file-arrow-up',
  pencil:       'fa-pen',
  trash:        'fa-trash',
  eye:          'fa-eye',
  arrowLeft:    'fa-arrow-left',
  folderOpen:   'fa-folder-open',
  externalLink: 'fa-arrow-up-right-from-square',
  checkCircle:  'fa-circle-check',
  docText:      'fa-file-lines',
  bell:         'fa-bell',
  xMark:        'fa-xmark',
  download:     'fa-download',
  star:         'fa-star',
  tag:          'fa-tag',
  link:         'fa-link',
  sync:         'fa-rotate',
  backup:       'fa-hard-drive',
  user:         'fa-user',
  palette:      'fa-palette',
  lock:         'fa-lock',
};

// Map Tailwind size classes to rem values
const sizeMap = {
  'w-3 h-3':     '0.75',
  'w-3.5 h-3.5': '0.875',
  'w-4 h-4':     '1',
  'w-5 h-5':     '1.25',
  'w-6 h-6':     '1.5',
  'w-7 h-7':     '1.75',
  'w-8 h-8':     '2',
  'w-10 h-10':   '2.5',
  'w-12 h-12':   '3',
};

export function icon(name, sizeClass = 'w-5 h-5') {
  const fa   = faMap[name] ?? 'fa-question';
  const size = sizeMap[sizeClass] ?? '1.25';
  return `<i class="fa-solid ${fa}" style="font-size:${size}rem;line-height:1;display:inline-block;width:${size}rem;text-align:center" aria-hidden="true"></i>`;
}

// Legacy export kept for any direct consumers
export const icons = {};
