"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Database,
  LockKeyhole,
  LogIn,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { getSupabase, hasSupabaseConfig } from "@/lib/supabase";

const AuthContext = createContext(null);

function readableAuthError(error) {
  const message = error?.message || "No fue posible iniciar sesión.";
  if (/invalid login credentials/i.test(message)) {
    return "Correo o contraseña incorrectos.";
  }
  if (/email not confirmed/i.test(message)) {
    return "La cuenta todavía no ha sido confirmada en Supabase.";
  }
  return message;
}

export function AuthProvider({ children }) {
  const supabase = getSupabase();
  const authorizedRef = useRef(false);
  const [session, setSession] = useState(null);
  const [authorized, setAuthorized] = useState(false);
  const [initializing, setInitializing] = useState(Boolean(supabase));
  const [connection, setConnection] = useState(
    hasSupabaseConfig() ? "checking" : "config-missing",
  );
  const [connectionMessage, setConnectionMessage] = useState("");
  const [authError, setAuthError] = useState("");

  const setAuthorization = useCallback((value) => {
    authorizedRef.current = value;
    setAuthorized(value);
  }, []);

  const probeConnection = useCallback(
    async (candidateSession = null, options = {}) => {
      const silent = Boolean(options.silent && authorizedRef.current);

      if (!supabase) {
        setAuthorization(false);
        setConnection("config-missing");
        setConnectionMessage(
          "La URL o la clave publicable de Supabase no están configuradas.",
        );
        return false;
      }

      let activeSession = candidateSession;
      if (!activeSession) {
        const { data } = await supabase.auth.getSession();
        activeSession = data.session;
      }

      if (!activeSession) {
        setAuthorization(false);
        setConnection("auth-required");
        setConnectionMessage("Inicie sesión para acceder a la cartera.");
        return false;
      }

      if (!silent) {
        setConnection("checking");
        setConnectionMessage("Validando acceso a FAO-HN-GeoHub…");
      }

      const { count, error } = await supabase
        .from("portfolio_projects")
        .select("id,deleted_at", { count: "exact", head: true });

      if (error) {
        if (silent && authorizedRef.current) {
          setConnection("degraded");
          setConnectionMessage(
            `La sesión sigue activa, pero la comprobación en segundo plano no respondió: ${error.message}`,
          );
          return false;
        }

        setAuthorization(false);
        setConnection("error");
        setConnectionMessage(
          `Supabase respondió, pero la migración operativa o los permisos no están listos: ${error.message}`,
        );
        return false;
      }

      setAuthorization(true);
      setConnection("connected");
      setConnectionMessage(
        `${count ?? 0} proyectos disponibles · sesión protegida`,
      );
      return true;
    },
    [setAuthorization, supabase],
  );

  useEffect(() => {
    if (!supabase) return undefined;

    let mounted = true;
    window.localStorage.removeItem("fao-geoportal-local-projects");

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) setAuthError(readableAuthError(error));

      const recoveredSession = data.session ?? null;
      setSession(recoveredSession);
      setInitializing(false);

      if (recoveredSession) {
        window.setTimeout(() => {
          void probeConnection(recoveredSession, { silent: false });
        }, 0);
      } else {
        setAuthorization(false);
        setConnection("auth-required");
        setConnectionMessage("Inicie sesión para acceder a la cartera.");
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;

      setSession(nextSession);
      setAuthError("");

      if (nextSession) {
        const silent = authorizedRef.current;
        window.setTimeout(() => {
          void probeConnection(nextSession, { silent });
        }, 0);
      } else {
        setAuthorization(false);
        setConnection("auth-required");
        setConnectionMessage("Inicie sesión para acceder a la cartera.");
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [probeConnection, setAuthorization, supabase]);

  const signIn = useCallback(
    async ({ email, password }) => {
      if (!supabase) throw new Error("Supabase no está configurado.");

      setAuthError("");
      setAuthorization(false);
      setConnection("checking");
      setConnectionMessage("Validando credenciales…");

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        const message = readableAuthError(error);
        setAuthError(message);
        setConnection("auth-required");
        throw new Error(message);
      }

      setSession(data.session ?? null);
      await probeConnection(data.session ?? null, { silent: false });
      return data;
    },
    [probeConnection, setAuthorization, supabase],
  );

  const signOut = useCallback(async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) throw error;
    setAuthorization(false);
    setSession(null);
    setConnection("auth-required");
    setConnectionMessage("Inicie sesión para acceder a la cartera.");
  }, [setAuthorization, supabase]);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      authorized,
      initializing,
      connection,
      connectionMessage,
      authError,
      signIn,
      signOut,
      retryConnection: () => probeConnection(session, { silent: false }),
    }),
    [
      authError,
      authorized,
      connection,
      connectionMessage,
      initializing,
      probeConnection,
      session,
      signIn,
      signOut,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe utilizarse dentro de AuthProvider.");
  }
  return context;
}

function AccessScreen({ mode, message, onRetry, onSignOut }) {
  const publicBasePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

  return (
    <main className="auth-screen">
      <section className="auth-card auth-card--status">
        <img
          src={`${publicBasePath}/geoportal-mark.svg`}
          alt=""
          width="58"
          height="58"
        />
        <span className="eyebrow">FAO HONDURAS · GEOHUB</span>
        <h1>
          {mode === "checking"
            ? "Conectando con la cartera"
            : "No fue posible abrir la cartera"}
        </h1>
        <p>{message}</p>
        <div className="auth-status-actions">
          {onRetry && (
            <button className="primary-button" onClick={onRetry} type="button">
              <RefreshCw size={16} /> Reintentar
            </button>
          )}
          {onSignOut && (
            <button className="secondary-button" onClick={onSignOut} type="button">
              Cerrar sesión
            </button>
          )}
        </div>
      </section>
    </main>
  );
}

function LoginScreen() {
  const { signIn, authError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const publicBasePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await signIn({ email, password });
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-screen">
      <section className="auth-card">
        <div className="auth-brand">
          <img
            src={`${publicBasePath}/geoportal-mark.svg`}
            alt=""
            width="58"
            height="58"
          />
          <div>
            <strong>FAO Honduras</strong>
            <span>Geoportal de Proyectos</span>
          </div>
        </div>

        <div className="auth-heading">
          <span className="eyebrow">ACCESO INSTITUCIONAL</span>
          <h1>Gestión integrada de la cartera</h1>
          <p>
            Ingrese con la cuenta creada en Supabase. La URL es pública, pero
            la información y las operaciones permanecen protegidas.
          </p>
        </div>

        <form className="auth-form" onSubmit={submit}>
          <label className="field">
            <span>Correo institucional</span>
            <input
              autoComplete="email"
              inputMode="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="nombre@fao.org"
              required
              type="email"
              value={email}
            />
          </label>
          <label className="field">
            <span>Contraseña</span>
            <input
              autoComplete="current-password"
              minLength={6}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>

          {(message || authError) && (
            <div className="form-error">{message || authError}</div>
          )}

          <button className="primary-button auth-submit" disabled={busy}>
            {busy ? (
              <>
                <RefreshCw className="spin" size={16} /> Validando…
              </>
            ) : (
              <>
                <LogIn size={16} /> Iniciar sesión
              </>
            )}
          </button>
        </form>

        <div className="auth-trust-grid">
          <div>
            <ShieldCheck size={17} />
            <span>Supabase Auth + RLS</span>
          </div>
          <div>
            <Database size={17} />
            <span>FAO-HN-GeoHub</span>
          </div>
          <div>
            <LockKeyhole size={17} />
            <span>Sin registro público</span>
          </div>
        </div>
      </section>
    </main>
  );
}

export function OperationalGate({ children }) {
  const {
    session,
    authorized,
    initializing,
    connection,
    connectionMessage,
    retryConnection,
    signOut,
  } = useAuth();

  if (initializing) {
    return (
      <AccessScreen
        message="Recuperando la sesión protegida y verificando Supabase…"
        mode="checking"
      />
    );
  }

  if (!hasSupabaseConfig()) {
    return (
      <AccessScreen
        message="Faltan las variables públicas de conexión a Supabase en GitHub Actions."
        mode="error"
      />
    );
  }

  if (!session) return <LoginScreen />;

  if (!authorized && connection === "checking") {
    return (
      <AccessScreen
        message={connectionMessage || "Validando permisos…"}
        mode="checking"
      />
    );
  }

  if (!authorized && connection === "error") {
    return (
      <AccessScreen
        message={connectionMessage}
        mode="error"
        onRetry={retryConnection}
        onSignOut={signOut}
      />
    );
  }

  return children;
}
