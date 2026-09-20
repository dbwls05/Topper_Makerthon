import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import AuthLayout from "../components/AuthLayout.jsx";
import PasswordInput from "../components/PasswordInput.jsx";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 공백 없는 영문/숫자/특수기호(ASCII)만 허용하고, 특수기호는 1개 이상 필요
const PASSWORD_ASCII_REGEX = /^[\x21-\x7E]+$/;
const PASSWORD_SPECIAL_REGEX = /[^A-Za-z0-9]/;
const PHONE_REGEX = /^01[016789]\d{7,8}$/;

// 숫자만 남기고 010-1234-5678 형태로 보여준다
function formatPhone(value) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length <= 10)
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

const INITIAL_FORM = {
  name: "",
  email: "",
  phone: "",
  password: "",
  passwordConfirm: "",
  agreed: false,
};

function validate(form) {
  const errors = {};
  if (form.name.trim().length < 2)
    errors.name = "이름을 2자 이상 입력해 주세요.";
  if (!EMAIL_REGEX.test(form.email.trim()))
    errors.email = "올바른 이메일 형식이 아니에요.";
  if (!PHONE_REGEX.test(form.phone.replace(/\D/g, "")))
    errors.phone = "올바른 휴대폰 번호를 입력해 주세요.";
  if (form.password.length < 8)
    errors.password = "비밀번호는 8자 이상이어야 해요.";
  else if (!PASSWORD_ASCII_REGEX.test(form.password))
    errors.password = "비밀번호는 영문, 숫자, 특수기호로만 입력해 주세요.";
  else if (!/[A-Za-z]/.test(form.password))
    errors.password = "비밀번호에 영문을 포함해 주세요.";
  else if (!PASSWORD_SPECIAL_REGEX.test(form.password))
    errors.password = "비밀번호에 특수기호를 1개 이상 포함해 주세요.";
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

// Supabase에서 이메일 인증(Confirm email)을 다시 켰을 때만 보이는 화면
function EmailConfirmPanel({ email }) {
  return (
    <div className="success-panel">
      <div className="success-icon">
        <CheckIcon />
      </div>
      <h1 className="success-title">인증 메일을 보냈어요!</h1>
      <p className="success-desc">
        <span className="success-mail">{email}</span> 로 인증 메일을 보냈어요.
        <br />
        메일함(스팸함 포함)에서 인증 후 로그인해 주세요.
      </p>
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
  const [done, setDone] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  // 로그인하라고 내보내진 경우 가입 후 원래 가려던 주소로 간다
  const next = location.state?.from ?? "/home";

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
        navigate(next, { replace: true });
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        // user_metadata에 이름·전화번호 저장 → 트리거가 profiles로 복사
        options: {
          data: {
            name: form.name.trim(),
            phone: form.phone.replace(/\D/g, ""),
          },
        },
      });

      if (error) {
        setFormError(toFriendlyError(error));
        return;
      }

      // 이메일 인증을 꺼두면 가입과 동시에 session이 발급된다 → 바로 로그인 상태로 메인으로 보낸다
      if (data.session) {
        navigate(next, { replace: true });
        return;
      }

      // 이메일 인증을 다시 켜면 session이 null로 와서 안내 화면을 보여준다
      setDone(true);
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
      <AuthLayout>
        <EmailConfirmPanel email={form.email} />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
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
          <label htmlFor="phone">전화번호</label>
          <input
            id="phone"
            type="tel"
            inputMode="numeric"
            value={form.phone}
            onChange={(event) =>
              updateField("phone")({
                target: { type: "text", value: formatPhone(event.target.value) },
              })
            }
            placeholder="010-0000-0000"
            autoComplete="tel"
            className={fieldErrors.phone ? "invalid" : ""}
          />
          {fieldErrors.phone && (
            <p className="field-error">{fieldErrors.phone}</p>
          )}
        </div>

        <div className="field">
          <label htmlFor="password">비밀번호</label>
          <PasswordInput
            id="password"
            value={form.password}
            onChange={updateField("password")}
            invalid={Boolean(fieldErrors.password)}
            placeholder="영문 8자 이상, 특수기호 1개 이상"
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
    </AuthLayout>
  );
}
