import test from 'node:test';
import assert from 'node:assert/strict';
import {componentApis} from '@gapscan/adapters';

test('React components: props, variants, sizes and states from TSX', () => {
  const source = `import React, {forwardRef} from 'react';
interface BaseProps { className?: string; disabled?: boolean }
export interface ButtonProps extends BaseProps {
  /** Visual style */ kind?: 'primary' | 'ghost' | 'danger';
  size?: "sm" | "md" | "lg";
  isBusy?: boolean; loading?: boolean;
  onClick?: (e: React.MouseEvent) => void; children?: React.ReactNode;
}
export const Button = forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => <button ref={ref} />);
type BadgeProps = {tone: 'success' | 'warning'; label: string};
export function Badge({tone, label}: BadgeProps) { return <span>{label}</span>; }
export const helper = () => null;`;
  const apis = componentApis(source, 'src/components.tsx');
  const button = apis.find(c => c.name === 'Button')!;
  assert.deepEqual(button.props.map(p => p.name), ['kind', 'size', 'isBusy', 'loading', 'disabled']);
  assert.deepEqual(button.variants, ['kind=primary', 'kind=ghost', 'kind=danger']);
  assert.deepEqual(button.sizes, ['sm', 'md', 'lg']);
  assert.deepEqual(button.states, ['loading', 'disabled']);
  const badge = apis.find(c => c.name === 'Badge')!;
  assert.deepEqual(badge.variants, ['tone=success', 'tone=warning']);
  assert.ok(!apis.some(c => c.name === 'helper'));
});

test('published declarations: MUI-style OwnProps with OverridableStringUnion', () => {
  const dts = `export interface ButtonPropsVariantOverrides {}
export interface ButtonOwnProps {
  children?: React.ReactNode;
  color?: OverridableStringUnion<'inherit' | 'primary' | 'secondary' | 'error', ButtonPropsColorOverrides>;
  disabled?: boolean;
  loading?: boolean | null;
  size?: OverridableStringUnion<'small' | 'medium' | 'large', ButtonPropsSizeOverrides>;
  variant?: OverridableStringUnion<'text' | 'outlined' | 'contained', ButtonPropsVariantOverrides>;
  startIcon?: React.ReactNode;
}
declare const Button: ExtendButtonBase<ButtonTypeMap>;
export default Button;`;
  const [button] = componentApis(dts, 'Button/Button.d.ts');
  assert.equal(button?.name, 'Button');
  assert.deepEqual(button?.sizes, ['small', 'medium', 'large']);
  assert.ok(['text', 'outlined', 'contained', 'color=primary', 'color=error'].every(v => button!.variants.includes(v)));
  assert.deepEqual(button?.states, ['disabled', 'loading']);
  assert.ok(button?.props.some(p => p.name === 'startIcon'));
});
