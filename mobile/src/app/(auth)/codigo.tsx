import { digits, useAction, useAuth } from '@finapp/shared';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { AuthScreen, Button, Field, FormError, NoticeBar } from '@/components';

export default function ResetCode() {
  const { api } = useAuth();
  const { email, notice: sent } = useLocalSearchParams<{ email?: string; notice?: string }>();
  const [code, setCode] = useState('');
  const [notice, setNotice] = useState(sent ?? null);
  const verify = useAction(async () => {
    await api.passwordReset.verify(email!, code);
    router.push({ pathname: '/nova-senha', params: { email: email!, code } });
  });
  const resend = useAction(async () => {
    const res = await api.passwordReset.request(email!);
    setNotice(`${res.message}. Um novo código só é enviado 1 minuto depois do anterior.`);
  });

  if (!email) return <Redirect href="/recuperar-senha" />;

  return (
    <AuthScreen title="Digite o código" description={`Enviamos um código de 6 dígitos para ${email}. Ele vale por 15 minutos.`}>
      <NoticeBar notice={notice ? { text: notice, error: false } : null} onClose={() => setNotice(null)} />
      <Field
        label="Código"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        placeholder="000000"
        value={code}
        onChange={setCode}
        mask={(v) => digits(v).slice(0, 6)}
        inputClassName="text-center font-mono text-2xl tracking-widest"
        onSubmit={() => code.length === 6 && verify.run()}
      />
      <FormError error={verify.error ?? resend.error} />
      <Button busy={verify.busy} disabled={code.length !== 6} onPress={() => verify.run()}>
        Verificar código
      </Button>
      <Button variant="ghost" busy={resend.busy} onPress={() => resend.run()}>
        Reenviar código
      </Button>
    </AuthScreen>
  );
}
