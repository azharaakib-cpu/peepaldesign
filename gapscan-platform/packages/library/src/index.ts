// Curated reference library: versioned ReferenceDS snapshots built from each
// library's published artifacts (not trained models, not hand-typed lists).
// `scripts/build.ts` rebuilds them; this module only reads the pinned files.
import {readdir, readFile} from 'node:fs/promises';
import {ReferenceDS} from '@gapscan/schema';
import type {ReferenceDS as ReferenceDSType} from '@gapscan/schema';

// `css` references are read from a published stylesheet (with previews); `types` references from published TypeScript declarations (APIs only).
// `bundles` read declaration files that are split across a folder: each component's index.d.ts, the
// same-folder files it imports, and shared prelude files, read together as one document.
export type ReferenceSource = {id: string; library: string; version: string; homepage: string; framework: string; kind: 'css' | 'types';
  artifacts: {url: string; name: string; classPrefix?: string}[]; bundles?: {base: string; components: string[]; prelude: string[]};
  // Web-component libraries: one folder per component, its tags are the style variants.
  customElements?: {package: string; version: string; folders: Record<string, string>}};
const MUI_COMPONENTS = ['Button', 'TextField', 'Checkbox', 'Radio', 'Switch', 'Select', 'Chip', 'Badge', 'Alert', 'Snackbar', 'Dialog', 'Tabs', 'Tooltip', 'Card', 'Avatar', 'Table', 'Slider', 'Menu', 'Breadcrumbs', 'Pagination', 'LinearProgress', 'CircularProgress', 'IconButton', 'ButtonGroup', 'AppBar', 'Drawer', 'Accordion', 'Fab', 'ToggleButton', 'Autocomplete', 'Link'];

export const REFERENCE_SOURCES: readonly ReferenceSource[] = [
  {id: 'bootstrap-5.3.3', library: 'Bootstrap', version: '5.3.3', homepage: 'https://getbootstrap.com/docs/5.3/', framework: 'HTML/CSS', kind: 'css',
    artifacts: [{url: 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.css', name: 'bootstrap.css'}]},
  {id: 'polaris-13.9.5', library: 'Shopify Polaris', version: '13.9.5', homepage: 'https://polaris.shopify.com/', framework: 'React', kind: 'css',
    artifacts: [{url: 'https://cdn.jsdelivr.net/npm/@shopify/polaris@13.9.5/build/esm/styles.css', name: 'polaris.css', classPrefix: 'Polaris-'},
      {url: 'https://cdn.jsdelivr.net/npm/@shopify/polaris-tokens@9.4.2/dist/css/styles.css', name: 'polaris-tokens.css'}]},
  {id: 'carbon-styles-1.68.0', library: 'IBM Carbon', version: '@carbon/styles 1.68.0', homepage: 'https://carbondesignsystem.com/', framework: 'React / Web Components', kind: 'css',
    artifacts: [{url: 'https://cdn.jsdelivr.net/npm/@carbon/styles@1.68.0/css/styles.css', name: 'carbon.css', classPrefix: 'cds--'}]},
  {id: 'bulma-1.0.2', library: 'Bulma', version: '1.0.2', homepage: 'https://bulma.io/', framework: 'HTML/CSS', kind: 'css',
    artifacts: [{url: 'https://cdn.jsdelivr.net/npm/bulma@1.0.2/css/bulma.css', name: 'bulma.css'}]},
  {id: 'mui-6.4.7', library: 'MUI (Material UI)', version: '6.4.7', homepage: 'https://mui.com/material-ui/', framework: 'React', kind: 'types',
    artifacts: MUI_COMPONENTS.map(c => ({url: `https://cdn.jsdelivr.net/npm/@mui/material@6.4.7/${c}/${c}.d.ts`, name: `${c}.d.ts`}))},
  {id: 'material-web-2.3.0', library: 'Material Design 3 (Material Web)', version: '2.3.0', homepage: 'https://m3.material.io/', framework: 'Web Components', kind: 'types', artifacts: [],
    customElements: {package: '@material/web', version: '2.3.0', folders: {button: 'Button', checkbox: 'Checkbox', chips: 'Chip', dialog: 'Dialog', divider: 'Divider', fab: 'Fab', iconbutton: 'Icon Button',
      list: 'List', menu: 'Menu', progress: 'Progress', radio: 'Radio', select: 'Select', slider: 'Slider', switch: 'Switch', tabs: 'Tabs', textfield: 'Text Field'}}},
  {id: 'antd-5.24.2', library: 'Ant Design', version: '5.24.2', homepage: 'https://ant.design/', framework: 'React', kind: 'types', artifacts: [],
    bundles: {base: 'https://cdn.jsdelivr.net/npm/antd@5.24.2/es', prelude: ['config-provider/SizeContext.d.ts', '_util/statusUtils.d.ts'],
      components: ['button', 'input', 'checkbox', 'radio', 'switch', 'select', 'tag', 'badge', 'alert', 'modal', 'tabs', 'tooltip', 'card', 'avatar', 'table', 'slider', 'menu', 'breadcrumb', 'pagination', 'progress', 'dropdown', 'drawer', 'collapse', 'float-button', 'segmented', 'auto-complete', 'steps', 'notification']}},
];

const ROOT = new URL('../references/', import.meta.url);
export type ReferenceSummary = {id: string; library: string; version: string; homepage: string; framework: string; kind: 'css' | 'types'; components: number; tokens: number; pinnedAt: string};

export async function listReferences(): Promise<ReferenceSummary[]> {
  const files = (await readdir(ROOT).catch(() => [] as string[])).filter(f => f.endsWith('.json')).sort();
  return Promise.all(files.map(async file => {
    const data = JSON.parse(await readFile(new URL(file, ROOT), 'utf8')) as ReferenceDSType & {meta?: {homepage?: string; framework?: string; kind?: 'css' | 'types'}};
    return {id: data.id, library: data.library, version: data.libraryVersion, homepage: data.meta?.homepage ?? '', framework: data.meta?.framework ?? '', kind: data.meta?.kind ?? 'css', components: data.components.length, tokens: data.tokens.length, pinnedAt: data.pinnedAt};
  }));
}

export async function loadReference(id: string): Promise<ReferenceDSType | null> {
  if (!/^[a-z0-9.@-]+$/i.test(id)) return null;
  try { return ReferenceDS.parse(JSON.parse(await readFile(new URL(`${id}.json`, ROOT), 'utf8'))); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; }
}
