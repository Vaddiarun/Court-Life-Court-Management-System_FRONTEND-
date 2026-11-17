import { useEffect, useState } from "react";
import { ArrowLeft, Building2, CalendarCheck2, KeyRound, Languages, PhoneCall, RefreshCw, Scale, Smartphone } from "lucide-react";
import { useAuth } from "../lib/auth";
import { useLanguages } from "../lib/hooks";
import { Button, ErrorBox, Field, Input, Select } from "../components/ui";

const FEATURES = [
  { icon: RefreshCw, text: "CNR lookup with automatic & manual court sync" },
  { icon: CalendarCheck2, text: "Hearing calendar with official vs manual dates" },
  { icon: PhoneCall, text: "Reminders by app, SMS and automated voice call" },
  { icon: Languages, text: "English + 22 scheduled Indian languages" },
];

function useBusy() {
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const run = async (fn) => {
    setError(null);
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };
  return { error, busy, run, setError };
}

// Resend countdown (backend allows one code per 30 s)
function useCountdown() {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  return [left, () => setLeft(30)];
}

function Notice({ info }) {
  if (!info) return null;
  const tone = info.tone === "amber" ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-700";
  return <p className={`rounded-lg px-3 py-2 text-sm ${tone}`}>{info.text}</p>;
}

function codeNotice(res, fallback) {
  if (res?.dev_code) return { tone: "amber", text: `Development mode — SMS is not connected, so your code is shown here: ${res.dev_code}` };
  return { tone: "green", text: fallback };
}

const PhoneInput = (props) => (
  <div className="relative">
    <span className="pointer-events-none absolute left-3 top-2 text-sm text-slate-400">+91</span>
    <Input inputMode="tel" autoComplete="tel" className="pl-11" placeholder="98123 45678" {...props} />
  </div>
);

function CodeInput({ value, onChange }) {
  return (
    <Input
      required
      autoFocus
      inputMode="numeric"
      autoComplete="one-time-code"
      maxLength={6}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
      className="text-center font-mono text-lg tracking-[0.5em]"
      placeholder="••••••"
    />
  );
}

function LoginForm() {
  const { requestOtp, verifyOtp } = useAuth();
  const { error, busy, run } = useBusy();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [info, setInfo] = useState(null);
  const [left, startCountdown] = useCountdown();

  const send = () =>
    run(async () => {
      const res = await requestOtp(phone.trim(), "login");
      if (res?.dev_hint) return setInfo({ tone: "amber", text: res.dev_hint });
      setSent(true);
      startCountdown();
      if (res?.dev_code) setCode(res.dev_code);
      setInfo(codeNotice(res, "We've sent a 6-digit code to your mobile by SMS."));
    });

  return (
    <form
      className="mt-6 space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        sent ? run(() => verifyOtp(phone.trim(), code.trim())) : send();
      }}
    >
      <ErrorBox error={error} />
      <Notice info={info} />
      <Field label="Mobile number">
        <PhoneInput required autoFocus={!sent} value={phone} onChange={(e) => setPhone(e.target.value)} disabled={sent} />
      </Field>
      {sent && (
        <Field label="Enter the 6-digit code">
          <CodeInput value={code} onChange={setCode} />
        </Field>
      )}
      <Button type="submit" className="w-full" loading={busy} icon={sent ? KeyRound : Smartphone}>
        {sent ? "Verify & sign in" : "Send OTP"}
      </Button>
      {sent && (
        <div className="flex justify-between text-xs">
          <button
            type="button"
            className="text-slate-500 hover:text-slate-800"
            onClick={() => {
              setSent(false);
              setCode("");
              setInfo(null);
            }}
          >
            Change number
          </button>
          <button type="button" disabled={left > 0 || busy} className="font-medium text-brand-600 disabled:text-slate-400" onClick={send}>
            {left > 0 ? `Resend in ${left}s` : "Resend code"}
          </button>
        </div>
      )}
    </form>
  );
}

function RegisterForm() {
  const { requestOtp, registerFirm } = useAuth();
  const { data: langs } = useLanguages();
  const { error, busy, run } = useBusy();
  const [f, setF] = useState({ firm_name: "", full_name: "", phone: "", email: "", default_language: "en", bar_council_id: "" });
  const [step, setStep] = useState(1);
  const [code, setCode] = useState("");
  const [info, setInfo] = useState(null);
  const [left, startCountdown] = useCountdown();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const sendCode = () =>
    run(async () => {
      const res = await requestOtp(f.phone.trim(), "register");
      setStep(2);
      startCountdown();
      if (res?.dev_code) setCode(res.dev_code);
      setInfo(codeNotice(res, `We've sent a 6-digit code to ${f.phone.trim()} to verify your number.`));
    });

  const create = () =>
    run(() => {
      const body = { firm_name: f.firm_name, full_name: f.full_name, phone: f.phone.trim(), code: code.trim(), default_language: f.default_language };
      if (f.email.trim()) body.email = f.email.trim();
      if (f.bar_council_id.trim()) body.bar_council_id = f.bar_council_id.trim();
      return registerFirm(body);
    });

  if (step === 2)
    return (
      <form
        className="mt-6 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          create();
        }}
      >
        <ErrorBox error={error} />
        <Notice info={info} />
        <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm">
          <p className="font-semibold text-slate-800">{f.firm_name}</p>
          <p className="text-slate-500">
            {f.full_name} · {f.phone}
          </p>
        </div>
        <Field label="Enter the 6-digit code">
          <CodeInput value={code} onChange={setCode} />
        </Field>
        <Button type="submit" className="w-full" loading={busy} icon={Building2}>
          Verify & create workspace
        </Button>
        <div className="flex justify-between text-xs">
          <button type="button" className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800" onClick={() => setStep(1)}>
            <ArrowLeft className="size-3" /> Edit details
          </button>
          <button type="button" disabled={left > 0 || busy} className="font-medium text-brand-600 disabled:text-slate-400" onClick={sendCode}>
            {left > 0 ? `Resend in ${left}s` : "Resend code"}
          </button>
        </div>
      </form>
    );

  return (
    <form
      className="mt-6 space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        sendCode();
      }}
    >
      <ErrorBox error={error} />
      <Field label="Law firm / chamber name">
        <Input required autoFocus value={f.firm_name} onChange={set("firm_name")} placeholder="Rao & Partners" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your full name">
          <Input required value={f.full_name} onChange={set("full_name")} placeholder="Adv. Priya Rao" />
        </Field>
        <Field label="Mobile number" hint="You'll sign in with this number">
          <PhoneInput required value={f.phone} onChange={set("phone")} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Email (optional)">
          <Input type="email" value={f.email} onChange={set("email")} placeholder="you@firm.in" />
        </Field>
        <Field label="Language">
          <Select value={f.default_language} onChange={set("default_language")}>
            {(langs || [{ code: "en", name: "English" }]).map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Bar Council ID (optional)">
        <Input value={f.bar_council_id} onChange={set("bar_council_id")} />
      </Field>
      <Button type="submit" className="w-full" loading={busy} icon={Smartphone}>
        Send verification code
      </Button>
      <p className="text-center text-xs text-slate-400">
        You'll be the Firm Admin. Add lawyers, junior advocates and clients (by mobile number) from Team & Clients.
      </p>
    </form>
  );
}

export default function Login() {
  const [mode, setMode] = useState("login");
  const registering = mode === "register";

  return (
    <div className="flex min-h-full">
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-brand-900 p-12 text-white lg:flex">
        <div className="absolute -right-24 -top-24 size-96 rounded-full bg-brand-600/30 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 size-96 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <span className="rounded-xl bg-brand-600 p-2">
            <Scale className="size-6" />
          </span>
          <span className="text-xl font-bold">Court Life</span>
        </div>
        <div className="relative">
          <h1 className="text-4xl font-bold leading-tight">
            Every case, hearing and reminder
            <br />
            in one place.
          </h1>
          <p className="mt-4 max-w-md text-indigo-200">The court management workspace for Indian lawyers, law firms and their clients.</p>
          <ul className="mt-8 space-y-3">
            {FEATURES.map((f) => (
              <li key={f.text} className="flex items-center gap-3 text-sm text-indigo-100">
                <span className="rounded-lg bg-white/10 p-1.5">
                  <f.icon className="size-4" />
                </span>
                {f.text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-indigo-300">Official court records remain authoritative.</p>
      </div>

      <div className="flex flex-1 items-center justify-center overflow-y-auto p-6">
        <div className={`w-full ${registering ? "max-w-lg" : "max-w-sm"}`}>
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <span className="rounded-lg bg-brand-600 p-1.5 text-white">
              <Scale className="size-5" />
            </span>
            <span className="text-lg font-bold">Court Life</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">{registering ? "Register your law firm" : "Sign in"}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {registering ? "Verify your mobile number and your workspace is ready." : "Enter your mobile number — we'll send you a one-time code."}
          </p>

          {registering ? <RegisterForm /> : <LoginForm />}

          <div className="mt-6 border-t border-slate-200 pt-5 text-center text-sm text-slate-500">
            {registering ? (
              <>
                Already registered?{" "}
                <button type="button" className="font-semibold text-brand-600 hover:underline" onClick={() => setMode("login")}>
                  Sign in
                </button>
              </>
            ) : (
              <>
                New to Court Life?{" "}
                <button type="button" className="font-semibold text-brand-600 hover:underline" onClick={() => setMode("register")}>
                  Register your law firm
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
