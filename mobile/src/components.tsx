// Componentes de interface do app. Mesmos nomes, props e tokens visuais (ui em @finapp/shared)
// dos componentes da web (web/src/components.tsx); só muda o elemento nativo.

import { cx, ui, type BadgeTone, type ButtonVariant, type Notice } from '@finapp/shared';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal as NativeModal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function Button({
  variant = 'primary',
  busy = false,
  disabled,
  onPress,
  children,
  className,
}: {
  variant?: ButtonVariant;
  busy?: boolean;
  disabled?: boolean;
  onPress(): void;
  children: string;
  className?: string;
}) {
  const off = disabled || busy;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityState={{ disabled: off, busy }}
      className={cx(ui.button.base, ui.button[variant], off && ui.button.disabled, 'active:opacity-80', className)}
    >
      <Text className={cx(ui.buttonText.base, ui.buttonText[variant])}>{busy ? 'Aguarde…' : children}</Text>
    </Pressable>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChange(value: string): void;
  /** máscara aplicada a cada digitação (maskMoney, maskDate...) */
  mask?: (value: string) => string;
  hint?: string;
  prefix?: string;
  type?: 'text' | 'email' | 'password';
  inputMode?: TextInputProps['inputMode'];
  placeholder?: string;
  autoComplete?: TextInputProps['autoComplete'];
  maxLength?: number;
  autoFocus?: boolean;
  className?: string;
  inputClassName?: string;
  onSubmit?(): void;
};

export function Field({ label, value, onChange, mask, hint, prefix, type = 'text', className, inputClassName, onSubmit, ...input }: FieldProps) {
  return (
    <View className={cx('gap-1.5', className)}>
      <Text className={ui.label}>{label}</Text>
      <View className="justify-center">
        {prefix && <Text className={cx(ui.muted, 'absolute left-3 z-10')}>{prefix}</Text>}
        <TextInput
          {...input}
          value={value}
          onChangeText={(text) => onChange(mask ? mask(text) : text)}
          secureTextEntry={type === 'password'}
          autoCapitalize={type === 'text' ? 'sentences' : 'none'}
          inputMode={input.inputMode ?? (type === 'email' ? 'email' : 'text')}
          placeholderTextColor="#94a3b8"
          onSubmitEditing={onSubmit}
          accessibilityLabel={label}
          className={cx(ui.input, prefix && 'pl-10', inputClassName)}
        />
      </View>
      {hint && <Text className={ui.small}>{hint}</Text>}
    </View>
  );
}

export function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label?: string;
  value: T;
  options: { value: T; label: string }[];
  onChange(value: NoInfer<T>): void;
}) {
  return (
    <View className="gap-1.5">
      {label && <Text className={ui.label}>{label}</Text>}
      <View className={ui.segmentGroup} accessibilityRole="radiogroup">
        {options.map((o) => {
          const active = o.value === value;
          return (
            <Pressable
              key={String(o.value)}
              onPress={() => onChange(o.value)}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              className={cx(ui.segment.base, active ? ui.segment.active : ui.segment.idle)}
            >
              <Text className={active ? ui.segmentText.active : ui.segmentText.idle}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
  ariaLabel,
  disabled,
}: {
  checked: boolean;
  onChange(checked: boolean): void;
  label?: ReactNode;
  /** nome para leitor de tela quando não há rótulo visível */
  ariaLabel?: string;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={() => onChange(!checked)}
      disabled={disabled}
      hitSlop={8}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel={ariaLabel}
      className={cx('flex-row items-center gap-2', disabled && 'opacity-50')}
    >
      <View className={cx(ui.checkbox.base, checked ? ui.checkbox.on : ui.checkbox.off)}>
        {checked && <Text className="text-xs font-bold text-white">✓</Text>}
      </View>
      {typeof label === 'string' ? <Text className={cx(ui.text, 'flex-1')}>{label}</Text> : label}
    </Pressable>
  );
}

export function Card({ title, action, children, className }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <View className={cx(ui.card, 'gap-3', className)}>
      {(title || action) && (
        <View className={ui.row}>
          {title && <Text className={ui.subtitle}>{title}</Text>}
          {action}
        </View>
      )}
      {children}
    </View>
  );
}

export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: string }) {
  return (
    <View className={cx(ui.badge, ui.badgeTone[tone])}>
      <Text className={ui.badgeText[tone]}>{children}</Text>
    </View>
  );
}

export function NoticeBar({ notice, onClose }: { notice: Notice; onClose(): void }) {
  if (!notice) return null;
  const tone = notice.error ? 'error' : 'ok';
  return (
    <View className={cx(ui.notice[tone], ui.row)} accessibilityRole={notice.error ? 'alert' : 'text'}>
      <Text className={cx(ui.noticeText[tone], 'flex-1')}>{notice.text}</Text>
      <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Fechar aviso">
        <Text className={ui.noticeText[tone]}>✕</Text>
      </Pressable>
    </View>
  );
}

export function FormError({ error }: { error: string | null }) {
  return error ? (
    <Text className={ui.error} accessibilityRole="alert">
      {error}
    </Text>
  ) : null;
}

export function Empty({ children }: { children: string }) {
  return <Text className={cx(ui.muted, 'py-4 text-center')}>{children}</Text>;
}

export function Row({ children, className }: { children: ReactNode; className?: string }) {
  return <View className={cx('flex-row items-start justify-between gap-3 py-3', ui.divider, className)}>{children}</View>;
}

export function Modal({ open, title, onClose, children }: { open: boolean; title: string; onClose(): void; children: ReactNode }) {
  return (
    <NativeModal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-white">
        <View className={cx(ui.row, 'border-b border-slate-100 px-5 py-4')}>
          <Text className={ui.subtitle}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Fechar">
            <Text className={cx(ui.muted, 'text-lg')}>✕</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerClassName="gap-4 p-5 pb-12" keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </NativeModal>
  );
}

export function Loading() {
  return <ActivityIndicator className="py-8" color="#059669" />;
}

/** tela rolável com "puxar para atualizar" */
export function Screen({ children, onRefresh, refreshing = false }: { children: ReactNode; onRefresh?(): void; refreshing?: boolean }) {
  return (
    <ScrollView
      className={ui.page}
      contentContainerClassName="gap-4 p-4 pb-10"
      keyboardShouldPersistTaps="handled"
      refreshControl={onRefresh && <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#059669" />}
    >
      {children}
    </ScrollView>
  );
}

/** descrição e ação do topo da tela (o título fica no cabeçalho da aba) */
export function PageHeader({ description, action }: { description?: string; action?: ReactNode }) {
  return (
    <View className="gap-3">
      {description && <Text className={ui.muted}>{description}</Text>}
      {action}
    </View>
  );
}

/** casca das telas de autenticação */
export function AuthScreen({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  const insets = useSafeAreaInsets(); // o topo fica com o cabeçalho da pilha
  return (
    <View className={cx('flex-1', ui.page)} style={{ paddingBottom: insets.bottom }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView contentContainerClassName="grow justify-center gap-6 p-6" keyboardShouldPersistTaps="handled">
          <View className="flex-row items-center justify-center gap-2">
            <View className="h-9 w-9 items-center justify-center rounded-xl bg-emerald-600">
              <Text className="text-lg font-bold text-white">F</Text>
            </View>
            <Text className="text-xl font-bold text-slate-900">FinApp</Text>
          </View>
          <View className={cx(ui.card, 'gap-4 p-6')}>
            <View className="gap-1">
              <Text className={ui.title}>{title}</Text>
              {description && <Text className={ui.muted}>{description}</Text>}
            </View>
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/** confirmação de ação destrutiva (na web é window.confirm) */
export function confirmAction(message: string, confirmLabel = 'Remover') {
  return new Promise<boolean>((resolve) =>
    Alert.alert('Confirmar', message, [
      { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
    ]),
  );
}
