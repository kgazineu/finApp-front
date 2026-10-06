import { PASSWORD_HINT, digits, passwordsMatch, ui, useAction, useAuth } from '@finapp/shared';
import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { Button, Field, FormError, NoticeBar } from '../components';

/** dados que passam de uma tela de recuperação para a próxima (fora da URL: o código é segredo) */
type FlowState = { email?: string; code?: string; notice?: string } | null;

function AuthForm({ title, description, onSubmit, children, footer }: {
  title: string;
  description?: string;
  onSubmit(): void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit();
  };
  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className={ui.title}>{title}</h1>
        {description && <p className={ui.muted}>{description}</p>}
      </div>
      {children}
      {footer && <div className="flex flex-col items-center gap-2 pt-2">{footer}</div>}
    </form>
  );
}

export function LoginPage() {
  const { signIn } = useAuth();
  const location = useLocation();
  const [notice, setNotice] = useState((location.state as FlowState)?.notice ?? null);
  const [email, setEmail] = useState((location.state as FlowState)?.email ?? '');
  const [password, setPassword] = useState('');
  const action = useAction(() => signIn(email, password));

  return (
    <AuthForm
      title="Entrar"
      description="Acompanhe seu saldo e veja quanto vai ter no mês que vem."
      onSubmit={() => action.run()}
      footer={
        <>
          <Link to="/recuperar-senha" state={{ email }} className={ui.link}>
            Esqueci minha senha
          </Link>
          <p className={ui.muted}>
            Não tem conta?{' '}
            <Link to="/cadastro" className={ui.link}>
              Criar conta
            </Link>
          </p>
        </>
      }
    >
      <NoticeBar notice={notice ? { text: notice, error: false } : null} onClose={() => setNotice(null)} />
      <Field label="E-mail" type="email" inputMode="email" autoComplete="email" value={email} onChange={setEmail} autoFocus />
      <Field label="Senha" type="password" autoComplete="current-password" value={password} onChange={setPassword} />
      <FormError error={action.error} />
      <Button type="submit" busy={action.busy}>
        Entrar
      </Button>
    </AuthForm>
  );
}

export function RegisterPage() {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const action = useAction(async () => {
    passwordsMatch(password, confirmation);
    await signUp(name, email, password);
  });

  return (
    <AuthForm
      title="Criar conta"
      onSubmit={() => action.run()}
      footer={
        <p className={ui.muted}>
          Já tem conta?{' '}
          <Link to="/entrar" className={ui.link}>
            Entrar
          </Link>
        </p>
      }
    >
      <Field label="Nome" autoComplete="name" value={name} onChange={setName} autoFocus />
      <Field label="E-mail" type="email" inputMode="email" autoComplete="email" value={email} onChange={setEmail} />
      <Field label="Senha" type="password" autoComplete="new-password" value={password} onChange={setPassword} hint={PASSWORD_HINT} />
      <Field label="Confirmar senha" type="password" autoComplete="new-password" value={confirmation} onChange={setConfirmation} />
      <FormError error={action.error} />
      <Button type="submit" busy={action.busy}>
        Criar conta
      </Button>
    </AuthForm>
  );
}

export function ForgotPasswordPage() {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState((useLocation().state as FlowState)?.email ?? '');
  const action = useAction(async () => {
    const res = await api.passwordReset.request(email.trim());
    navigate('/recuperar-senha/codigo', { state: { email: email.trim(), notice: res.message } });
  });

  return (
    <AuthForm
      title="Recuperar senha"
      description="Informe o e-mail da sua conta. Vamos enviar um código de 6 dígitos para você criar uma senha nova."
      onSubmit={() => action.run()}
      footer={
        <Link to="/entrar" className={ui.link}>
          Voltar para o login
        </Link>
      }
    >
      <Field label="E-mail" type="email" inputMode="email" autoComplete="email" value={email} onChange={setEmail} autoFocus />
      <FormError error={action.error} />
      <Button type="submit" busy={action.busy}>
        Enviar código
      </Button>
    </AuthForm>
  );
}

export function ResetCodePage() {
  const { api } = useAuth();
  const navigate = useNavigate();
  const flow = useLocation().state as FlowState;
  const [code, setCode] = useState('');
  const [notice, setNotice] = useState(flow?.notice ?? null);
  const verify = useAction(async () => {
    await api.passwordReset.verify(flow!.email!, code);
    navigate('/recuperar-senha/nova-senha', { state: { email: flow!.email, code } });
  });
  const resend = useAction(async () => {
    const res = await api.passwordReset.request(flow!.email!);
    setNotice(`${res.message}. Um novo código só é enviado 1 minuto depois do anterior.`);
  });

  if (!flow?.email) return <Navigate to="/recuperar-senha" replace />;

  return (
    <AuthForm
      title="Digite o código"
      description={`Enviamos um código de 6 dígitos para ${flow.email}. Ele vale por 15 minutos.`}
      onSubmit={() => verify.run()}
      footer={
        <>
          <Button variant="ghost" busy={resend.busy} onClick={() => resend.run()}>
            Reenviar código
          </Button>
          <Link to="/recuperar-senha" state={{ email: flow.email }} className={ui.link}>
            Trocar e-mail
          </Link>
        </>
      }
    >
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
        inputClassName="text-center font-mono text-2xl tracking-[0.5em]"
        autoFocus
      />
      <FormError error={verify.error ?? resend.error} />
      <Button type="submit" busy={verify.busy} disabled={code.length !== 6}>
        Verificar código
      </Button>
    </AuthForm>
  );
}

export function NewPasswordPage() {
  const { api } = useAuth();
  const navigate = useNavigate();
  const flow = useLocation().state as FlowState;
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const action = useAction(async () => {
    passwordsMatch(password, confirmation);
    const res = await api.passwordReset.confirm(flow!.email!, flow!.code!, password);
    navigate('/entrar', { replace: true, state: { email: flow!.email, notice: res.message } });
  });

  if (!flow?.email || !flow.code) return <Navigate to="/recuperar-senha" replace />;

  return (
    <AuthForm
      title="Nova senha"
      description="Crie a senha nova. Por segurança, todas as sessões abertas serão encerradas."
      onSubmit={() => action.run()}
    >
      <Field label="Nova senha" type="password" autoComplete="new-password" value={password} onChange={setPassword} hint={PASSWORD_HINT} autoFocus />
      <Field label="Confirmar nova senha" type="password" autoComplete="new-password" value={confirmation} onChange={setConfirmation} />
      <FormError error={action.error} />
      <Button type="submit" busy={action.busy}>
        Salvar nova senha
      </Button>
    </AuthForm>
  );
}
