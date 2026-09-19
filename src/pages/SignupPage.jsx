import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import signinVisual from "../public/signin.svg";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const INITIAL_FORM = {
  name: "",
  email: "",
  password: "",
  passwordConfirm: "",
  agreed: false,
};

// 성공 시 화면 분기에 쓰는 상태
// demo: Supabase 미설정 데모 모드 여부
// emailConfirmed: 이메일 인증 메일을 기다려야 하는지 (Supabase 설정에 따라 다름)
const INITIAL_DONE = { demo: false, emailConfirmed: true };

function validate(form) {
  const errors = {};
  if (form.name.trim().length < 2)
    errors.name = "이름을 2자 이상 입력해 주세요.";
  if (!EMAIL_REGEX.test(form.email.trim()))
    errors.email = "올바른 이메일 형식이 아니에요.";
  if (form.password.length < 8)
    errors.password = "비밀번호는 8자 이상이어야 해요.";
  if (form.password !== form.passwordConfirm)
    errors.passwordConfirm = "비밀번호가 일치하지 않아요.";
  if (!form.agreed) errors.agreed = "약관에 동의해 주세요.";
  return errors;
}

// Supabase가 내려주는 에러를 사용자가 읽을 수 있는 메시지로 바꾼다
function toFriendlyError(error) {
  const message = error.message ?? "";
  if (/already|duplicate/i.test(message))
    return "이미 가입된 이메일이에요. 로그인해 주세요.";
  if (/rate|too many/i.test(message))
    return "요청이 너무 많아요. 잠시 후 다시 시도해 주세요.";
  if (/password/i.test(message))
    return "비밀번호가 너무 약해요. 더 복잡하게 만들어 주세요.";
  if (/invalid/i.test(message)) return "이메일 형식을 다시 확인해 주세요.";
  return `가입 중 문제가 발생했어요: ${message}`;
}

function CheckIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 12.5L10 17.5L19 7"
        stroke="#16a34a"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EyeIcon({ open }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2 12C4 7.5 7.6 5 12 5s8 2.5 10 7c-2 4.5-5.6 7-10 7s-8-2.5-10-7Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" fill="currentColor" />
      {!open && (
        <path
          d="M4 20L20 4"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

function PasswordInput({ id, value, onChange, invalid }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="input-wrap">
      <input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder="8자이상 입력하세요"
        autoComplete="new-password"
        className={invalid ? "invalid" : ""}
      />
      <button
        type="button"
        className="input-toggle"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "비밀번호 숨기기" : "비밀번호 보기"}
      >
        <EyeIcon open={visible} />
      </button>
    </div>
  );
}

function SignupLayout({ children }) {
  return (
    <main className="signup-page">
      <aside className="signup-visual">
        <img
          src={signinVisual}
          alt="알아서 찾고, 끝까지 챙겨요. 내 상황에 맞는 혜택을 발견하고 신청 준비까지 놓치지 않도록."
        />
      </aside>
      <section className="signup-content">
        <div className="signup-inner">{children}</div>
      </section>
    </main>
  );
}

function SuccessPanel({ form, done }) {
  return (
    <div className="success-panel">
      <div className="success-icon">
        <CheckIcon />
      </div>
      <h1 className="success-title">
        {done.emailConfirmed ? "인증 메일을 보냈어요!" : "회원가입 완료!"}
      </h1>
      {done.demo && (
        <p className="success-desc">(데모 모드 — 실제로 저장되지는 않았어요)</p>
      )}
      {done.emailConfirmed ? (
        <p className="success-desc">
          <span className="success-mail">{form.email}</span> 로 인증 메일을
          보냈어요.
          <br />
          메일함(스팸함 포함)에서 인증 후 로그인해 주세요.
        </p>
      ) : (
        <p className="success-desc">
          바로 로그인해서 서비스를 시작할 수 있어요.
        </p>
      )}
      <div className="success-actions">
        <Link className="btn btn--primary" to="/login">
          로그인하러 가기
        </Link>
      </div>
    </div>
  );
}

export default function SignupPage() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(null);

  function updateField(key) {
    return (event) => {
      const value =
        event.target.type === "checkbox"
          ? event.target.checked
          : event.target.value;
      setForm((prev) => ({ ...prev, [key]: value }));
      // 입력을 다시 시작하면 그 필드의 에러와 폼 전체 에러를 지워준다
      setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
      setFormError("");
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const errors = validate(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    setFormError("");

    try {
      if (!supabase) {
        // Supabase 미설정 시 데모 모드: 저장 없이 성공 화면까지만 흐름을 보여준다
        await new Promise((resolve) => setTimeout(resolve, 600));
        setDone({ ...INITIAL_DONE, demo: true, emailConfirmed: false });
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: { data: { name: form.name.trim() } }, // user_metadata에 이름 저장
      });

      if (error) {
        setFormError(toFriendlyError(error));
        return;
      }

      // 이메일 인증을 켜두면 session이 null로 오고, 꺼두면 바로 session이 발급된다
      setDone({ ...INITIAL_DONE, emailConfirmed: !data.session });
    } catch {
      setFormError(
        "네트워크 문제로 가입에 실패했어요. 인터넷 연결을 확인해 주세요.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <SignupLayout>
        <SuccessPanel form={form} done={done} />
      </SignupLayout>
    );
  }

  return (
    <SignupLayout>
      <h1 className="signup-title">
        <strong>나에게 맞는 혜택</strong>을
        <br />
        함께 찾아볼까요?
      </h1>
      <p className="signup-subtitle">
        간단한 정보만 입력해주시면 더 정확한 혜택을 추천해드려요.
      </p>

      {!supabase && (
        <p className="demo-banner">
          Supabase가 연결되지 않았어요. <code>.env</code> 에
          <code>VITE_SUPABASE_URL</code>, <code>VITE_SUPABASE_ANON_KEY</code> 를
          채우면 실제 가입이 저장돼요. (지금은 데모 모드)
        </p>
      )}
      {formError && <p className="form-error">{formError}</p>}

      <form onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="name">이름</label>
          <input
            id="name"
            type="text"
            value={form.name}
            onChange={updateField("name")}
            placeholder="이름을 입력해주세요"
            autoComplete="name"
            className={fieldErrors.name ? "invalid" : ""}
          />
          {fieldErrors.name && (
            <p className="field-error">{fieldErrors.name}</p>
          )}
        </div>

        <div className="field">
          <label htmlFor="email">이메일</label>
          <input
            id="email"
            type="email"
            value={form.email}
            onChange={updateField("email")}
            placeholder="이메일을 입력해주세요"
            autoComplete="email"
            className={fieldErrors.email ? "invalid" : ""}
          />
          {fieldErrors.email && (
            <p className="field-error">{fieldErrors.email}</p>
          )}
        </div>

        <div className="field">
          <label htmlFor="password">비밀번호</label>
          <PasswordInput
            id="password"
            value={form.password}
            onChange={updateField("password")}
            invalid={Boolean(fieldErrors.password)}
          />
          {fieldErrors.password && (
            <p className="field-error">{fieldErrors.password}</p>
          )}
        </div>

        <div className="field">
          <label htmlFor="passwordConfirm">비밀번호 확인</label>
          <PasswordInput
            id="passwordConfirm"
            value={form.passwordConfirm}
            onChange={updateField("passwordConfirm")}
            invalid={Boolean(fieldErrors.passwordConfirm)}
          />
          {fieldErrors.passwordConfirm && (
            <p className="field-error">{fieldErrors.passwordConfirm}</p>
          )}
        </div>

        <div className="agree">
          <label className="agree-label">
            <input
              type="checkbox"
              checked={form.agreed}
              onChange={updateField("agreed")}
            />
            서비스 이용약관과 개인정보 처리방침에 동의합니다
          </label>
          {fieldErrors.agreed && (
            <p className="field-error">{fieldErrors.agreed}</p>
          )}
        </div>

        <button
          className="btn btn--primary btn--lg"
          type="submit"
          disabled={submitting}
        >
          {submitting ? "가입 중..." : "회원가입"}
        </button>
      </form>

      <p className="auth-switch">
        이미 계정이 있나요? <Link to="/login">로그인</Link>
      </p>
    </SignupLayout>
  );
}
