import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Download,
  ExternalLink,
  FileDown,
  Info,
  Mail,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";

import type { FormEvent } from "react";
import { departments, segments, type Segment } from "./data/segments";
import { createApplicationPdf } from "./lib/applicationPdf";
import { getSupabaseClient } from "./lib/supabase";

type Fields = {
  fullName: string;
  studentId: string;
  department: string;
  whatsapp: string;
  email: string;
  priorKnowledgeExperience: string;
  whyJoinNcc: string;
};

type FieldName = keyof Fields | "photo" | "segments" | "otherInterest";
type FormErrors = Partial<Record<FieldName, string>>;

type ApplicationReceipt = {
  id: string;
  fields: Fields;
  segments: string[];
  photoUrl: string;
  xp: number;
};

const officialSite = "https://www.nitercomputerclub.tech/";
const maxPhotoSizeBytes = 2 * 1024 * 1024;
const initialFields: Fields = {
  fullName: "",
  studentId: "",
  department: "",
  whatsapp: "",
  email: "",
  priorKnowledgeExperience: "",
  whyJoinNcc: "",
};

const departmentIdPrefixes: Record<string, string> = {
  CSE: "CS",
  EEE: "EE",
  "Textile Engineering": "TE",
  IPE: "IP",
  FDAE: "FD",
};

function isValidStudentId(studentId: string, department: string) {
  const expectedPrefix = departmentIdPrefixes[department];
  const match = /^([A-Z]{2})-26\d+$/i.exec(studentId.trim());
  return Boolean(expectedPrefix && match?.[1].toUpperCase() === expectedPrefix);
}

function getDepartmentFromStudentId(studentId: string) {
  const prefix = /^\s*([a-z]{2})(?:-|$)/i.exec(studentId)?.[1].toUpperCase();
  return Object.entries(departmentIdPrefixes).find(([, idPrefix]) => idPrefix === prefix)?.[0];
}

async function loadImageDataUrl(imagePath: string) {
  const response = await fetch(imagePath);
  if (!response.ok) {
    throw new Error(`Could not load PDF image: ${imagePath}`);
  }

  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error(`Could not prepare PDF image: ${imagePath}`));
    };
    reader.onerror = () => reject(new Error(`Could not read PDF image: ${imagePath}`));
    reader.readAsDataURL(blob);
  });
}

function getErrors(
  fields: Fields,
  photo: File | null,
  selectedSegments: string[],
  otherInterest: string,
  includesOtherInterest: boolean,
): FormErrors {
  const errors: FormErrors = {};

  if (fields.fullName.trim().length < 2) {
    errors.fullName = "Enter your full name (at least 2 characters).";
  }
  if (!isValidStudentId(fields.studentId, fields.department)) {
    const prefix = departmentIdPrefixes[fields.department];
    errors.studentId = prefix
      ? `Enter your ${prefix} department ID in this format: ${prefix}-2607001.`
      : "Choose your department, then enter its matching ID prefix and a number beginning with 26 (for example CS-2607001).";
  }
  if (!fields.department) {
    errors.department = "Choose your department.";
  }
  const phoneInput = fields.whatsapp.trim();
  const phoneDigits = phoneInput.replace(/\D/g, "");
  if (!/^[+()\d\s-]+$/.test(phoneInput) || phoneDigits.length < 8 || phoneDigits.length > 15) {
    errors.whatsapp = "Enter a WhatsApp number with 8 to 15 digits.";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim())) {
    errors.email = "Enter a valid email address.";
  }
  if (!photo) {
    errors.photo = "Add a passport-size photo to continue.";
  }
  if (selectedSegments.length === 0 && !includesOtherInterest) {
    errors.segments = "Choose at least one segment.";
  }
  if (includesOtherInterest && !otherInterest.trim()) {
    errors.otherInterest = "Describe your other interest.";
  } else if (includesOtherInterest && otherInterest.trim().length > 120) {
    errors.otherInterest = "Keep your interest under 120 characters.";
  }

  return errors;
}

function calculateXp(
  fields: Fields,
  photo: File | null,
  chosen: string[],
  otherInterest: string,
) {
  const milestones = [
    fields.fullName.trim().length >= 2,
    isValidStudentId(fields.studentId, fields.department),
    Boolean(fields.department),
    /^[+()\d\s-]+$/.test(fields.whatsapp.trim()) &&
      fields.whatsapp.replace(/\D/g, "").length >= 8 &&
      fields.whatsapp.replace(/\D/g, "").length <= 15,
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim()),
    Boolean(photo),
    chosen.length > 0 || Boolean(otherInterest.trim()),
  ];

  return Math.min(milestones.filter(Boolean).length * 15, 100);
}

function ByteBot() {
  return (
    <div className="bytebot-stage" role="img" aria-label="Byte-Bot, the NCC application mascot">
      <svg className="bytebot-mascot" viewBox="0 0 220 220" aria-hidden="true">
        <path d="M110 10v21" stroke="#f3f0ef" strokeWidth="8" strokeLinecap="round" />
        <circle cx="110" cy="10" r="8" fill="#a5e6b5" />
        <path d="M55 129 39 161m126-32 16 32" fill="none" stroke="#f3f0ef" strokeWidth="13" strokeLinecap="round" />
        <rect x="67" y="126" width="86" height="61" rx="23" fill="#a5e6b5" />
        <path d="M94 187v15m32-15v15" stroke="#f3f0ef" strokeWidth="12" strokeLinecap="round" />
        <path d="M41 71c0-15 12-27 27-27h84c15 0 27 12 27 27v53c0 15-12 27-27 27H68c-15 0-27-12-27-27V71Z" fill="#f8f7f5" />
        <rect x="54" y="60" width="112" height="72" rx="25" fill="#241d23" />
        <circle cx="87" cy="95" r="9" fill="#a5e6b5" />
        <circle cx="133" cy="95" r="9" fill="#a5e6b5" />
        <path d="M91 114c11 9 27 9 38 0" fill="none" stroke="#f8f7f5" strokeWidth="5" strokeLinecap="round" />
        <circle cx="40" cy="165" r="11" fill="#e7a7bc" />
        <circle cx="180" cy="165" r="11" fill="#e7a7bc" />
        <rect x="97" y="151" width="26" height="17" rx="6" fill="#241d23" />
        <circle cx="110" cy="159" r="3" fill="#a5e6b5" />
      </svg>
    </div>
  );
}

function DinoRunner() {
  return (
    <div className="dino-runner" role="img" aria-label="Dino running along the form progress bar">
      <picture>
        <source
          media="(prefers-reduced-motion: reduce)"
          srcSet="/images/dino-run-pose.png"
        />
        <img src="/images/dino-run-cycle.gif" alt="" />
      </picture>
    </div>
  );
}

function MascotGuide({
  tip,
  setTip,
}: {
  tip: string;
  setTip: (tip: string) => void;
}) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          if (document.querySelector(".application-form :focus")) continue;
          setTip(
            entry.target.id === "segments"
              ? "Pick a segment that fits your interests, or add your own."
              : "Your ID should look like CS-2607001. I’ll keep your application preview updated.",
          );
        }
      },
      { threshold: 0.15 },
    );
    document.querySelectorAll("#segments, #apply").forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [setTip]);

  useEffect(() => {
    setOpen(true);
    const timeout = window.setTimeout(() => setOpen(false), 7000);
    return () => window.clearTimeout(timeout);
  }, [tip]);

  return (
    <aside className={`mascot-guide${open ? " is-open" : ""}`} aria-label="Application helper">
      {open && <p className="mascot-chat" aria-live="polite">{tip}</p>}
      <button
        className="mascot-guide-button"
        type="button"
        aria-label={open ? "Hide application helper message" : "Show application helper message"}
        aria-expanded={open}
        onClick={() => setOpen((isOpen) => !isOpen)}
      >
        <ByteBot />
      </button>
    </aside>
  );
}

function LiveApplicationPreview({
  fields,
  photoUrl,
  selectedSegments,
  includesOtherInterest,
  otherInterest,
}: {
  fields: Fields;
  photoUrl: string;
  selectedSegments: string[];
  includesOtherInterest: boolean;
  otherInterest: string;
}) {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia("(max-width: 680px)").matches);
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 680px)");
    const update = () => setIsMobile(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const previewRows: [string, string, boolean][] = [
    ["Application Number", "Added on submission", true],
    ["Full Name", fields.fullName, !fields.fullName],
    ["Student ID", fields.studentId, !fields.studentId],
    ["Department", fields.department, !fields.department],
    ["WhatsApp Number", fields.whatsapp, !fields.whatsapp],
    ["Email Address", fields.email, !fields.email],
    ["Application Date", "Added on submission", true],
  ];
  const previewInterests = [
    ...selectedSegments,
    ...(includesOtherInterest && otherInterest.trim()
      ? [`Other: ${otherInterest.trim()}`]
      : []),
  ];
  const previewResponses: Array<[string, string]> = [
    ["Prior Knowledge & Experience", fields.priorKnowledgeExperience] as [string, string],
    ["Why Join NITER Computer Club?", fields.whyJoinNcc] as [string, string],
  ].filter(([, value]) => value.trim());
  const previewResponseFontSize = Math.max(
    4,
    7 - previewResponses.reduce((total, [, value]) => total + value.length, 0) / 900,
  );

  return (
    <details
      className="live-preview-panel"
      aria-label="Live application form preview"
      open={!isMobile || mobilePreviewOpen}
      onToggle={(event) => setMobilePreviewOpen(event.currentTarget.open)}
    >
      <summary className="preview-panel-heading">
        <span>Live A4 preview</span>
        <span className="preview-live">LIVE</span>
      </summary>
      <img
        className="preview-sleeping-cat"
        src="/images/retro-cat-idle.gif"
        alt=""
        aria-hidden="true"
      />
      <div className="preview-paper">
        <header className="preview-paper-header">
          <div className="preview-logo-frame">
            <img src="/images/ncc-logo.png" alt="NITER Computer Club logo" />
          </div>
          <div className="preview-paper-title">
            <strong>NITER COMPUTER CLUB</strong>
            <span>OFFICIAL RECRUITMENT APPLICATION · SESSION 2026</span>
            <b>APPLICATION · GENERATED ON SUBMISSION</b>
          </div>
        </header>
        <section className="preview-applicant-section" aria-label="Applicant information">
          <div className="preview-section-band">
            <strong>APPLICANT INFORMATION</strong>
          </div>
          <div className="preview-applicant-content">
            <dl className="preview-data">
              {previewRows.map(([label, value, isPlaceholder]) => (
                <div key={label}>
                  <dt>{label}:</dt>
                  <dd className={isPlaceholder ? "preview-empty" : ""}>{value || "To be completed"}</dd>
                </div>
              ))}
            </dl>
            <div className="preview-photo-frame">
              {photoUrl ? (
                <img src={photoUrl} alt="Live preview of applicant photo" />
              ) : (
                <span>PHOTO</span>
              )}
            </div>
          </div>
        </section>
        <section className="preview-selected" aria-label="Selected segments">
          <div className="preview-section-band preview-segment-band">
            <strong>SELECTED SEGMENTS</strong>
            <span>{previewInterests.length} selected</span>
          </div>
          {previewInterests.length ? (
            <p className="preview-segment-list">{previewInterests.join(" · ")}</p>
          ) : (
            <p className="preview-empty">Choose segments or add another interest</p>
          )}
        </section>
        {previewResponses.map(([heading, value]) => (
          <section className="preview-response-section" key={heading}>
            <h3>{heading}</h3>
            <p style={{ fontSize: `${previewResponseFontSize}px` }}>{value}</p>
          </section>
        ))}
        <footer className="preview-paper-footer">
          <span>NITER Computer Club · Member Recruitment 2026</span>
        </footer>
      </div>
      <p className="preview-hint">Updates as you complete your application.</p>
    </details>
  );
}

function App() {
  const [fields, setFields] = useState<Fields>(initialFields);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [photoDataUrl, setPhotoDataUrl] = useState("");
  const [chosenSegments, setChosenSegments] = useState<string[]>([]);
  const [includesOtherInterest, setIncludesOtherInterest] = useState(false);
  const [otherInterest, setOtherInterest] = useState("");
  const [mascotTip, setMascotTip] = useState("Hi! Pick a segment you like—or tell me about another interest.");
  const [errors, setErrors] = useState<FormErrors>({});
  const [submissionError, setSubmissionError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeSegment, setActiveSegment] = useState<Segment | null>(null);
  const [receipt, setReceipt] = useState<ApplicationReceipt | null>(null);
  const [pdfError, setPdfError] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminUserEmail, setAdminUserEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminError, setAdminError] = useState("");
  const [adminBusy, setAdminBusy] = useState(false);
  const segmentDialogRef = useRef<HTMLDialogElement>(null);
  const receiptDialogRef = useRef<HTMLDialogElement>(null);
  const adminDialogRef = useRef<HTMLDialogElement>(null);

  const xp = useMemo(
    () => calculateXp(fields, photo, chosenSegments, includesOtherInterest ? otherInterest : ""),
    [fields, photo, chosenSegments, includesOtherInterest, otherInterest],
  );
  const formProgress = useMemo(() => {
    const completedDetails = [
      fields.fullName.trim().length >= 2,
      isValidStudentId(fields.studentId, fields.department),
      Boolean(fields.department),
      /^[+()\d\s-]+$/.test(fields.whatsapp.trim()) &&
        fields.whatsapp.replace(/\D/g, "").length >= 8 &&
        fields.whatsapp.replace(/\D/g, "").length <= 15,
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim()),
      Boolean(photo),
    ].filter(Boolean).length;

    return Math.round((completedDetails / 6) * 100);
  }, [fields, photo]);
  const selectedInterests = useMemo(
    () => [
      ...chosenSegments,
      ...(includesOtherInterest && otherInterest.trim() ? [`Other: ${otherInterest.trim()}`] : []),
    ],
    [chosenSegments, includesOtherInterest, otherInterest],
  );
  useEffect(() => {
    if (activeSegment && segmentDialogRef.current && !segmentDialogRef.current.open) {
      segmentDialogRef.current.showModal();
    }
  }, [activeSegment]);

  useEffect(() => {
    if (receipt && receiptDialogRef.current && !receiptDialogRef.current.open) {
      receiptDialogRef.current.showModal();
    }
  }, [receipt]);

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  function updateField(field: keyof Fields, value: string) {
    setFields((current) => {
      if (field === "department") {
        const idPrefix = departmentIdPrefixes[value];
        if (!idPrefix) return { ...current, department: value };

        const existingSuffix = /^[a-z]{2}-26(\d*)$/i.exec(current.studentId.trim())?.[1] ?? "";
        return {
          ...current,
          department: value,
          studentId: `${idPrefix}-26${existingSuffix}`,
        };
      }

      if (field === "studentId") {
        return {
          ...current,
          studentId: value,
          department: getDepartmentFromStudentId(value) ?? current.department,
        };
      }

      return { ...current, [field]: value };
    });
    setErrors((current) => ({
      ...current,
      [field]: undefined,
      ...(field === "studentId" ? { department: undefined } : {}),
      ...(field === "department" ? { studentId: undefined } : {}),
    }));
    setSubmissionError("");
  }

  function acceptPhoto(file?: File) {
    if (!file) return;
    setSubmissionError("");
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setPhoto(null);
      setPhotoPreview("");
      setPhotoDataUrl("");
      setErrors((current) => ({
        ...current,
        photo: "Use a JPEG or PNG image file.",
      }));
      return;
    }
    if (file.size > maxPhotoSizeBytes) {
      setPhoto(null);
      setPhotoPreview("");
      setPhotoDataUrl("");
      setErrors((current) => ({
        ...current,
        photo: "Your photo must be 2 MB or smaller.",
      }));
      return;
    }

    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
    setPhotoDataUrl("");
    setErrors((current) => ({ ...current, photo: undefined }));
    setSubmissionError("");

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPhotoDataUrl(reader.result);
      } else {
        setErrors((current) => ({ ...current, photo: "We couldn't preview that photo. Try another file." }));
      }
    };
    reader.onerror = () => {
      setErrors((current) => ({ ...current, photo: "We couldn't read that photo. Try another file." }));
    };
    reader.readAsDataURL(file);
  }

  function toggleSegment(name: string) {
    setChosenSegments((current) =>
      current.includes(name) ? current.filter((item) => item !== name) : [...current, name],
    );
    setErrors((current) => ({ ...current, segments: undefined }));
    setSubmissionError("");
    setMascotTip(chosenSegments.includes(name)
      ? "Removed. You can choose another path any time."
      : `${name} added! Pick another segment or continue to your details.`);
  }

  async function submitApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = getErrors(fields, photo, chosenSegments, otherInterest, includesOtherInterest);
    setErrors(nextErrors);
    setSubmissionError("");

    if (Object.keys(nextErrors).length > 0) {
      setMascotTip("A couple of details need attention. I’ll guide you to the first one.");
      document.querySelector<HTMLElement>(".field-error:not(:empty)")?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      return;
    }

    if (!photo || !photoDataUrl) {
      setErrors((current) => ({
        ...current,
        photo: "Your photo is still being prepared. Please wait a moment and try again.",
      }));
      return;
    }

    setIsSubmitting(true);
    let uploadedPhoto = false;

    try {
      const supabase = getSupabaseClient();
      const submissionId = crypto.randomUUID();
      const safeStudentId = fields.studentId.trim().replace(/[^a-zA-Z0-9_-]/g, "-");
      const fileExtension = photo.type === "image/png" ? "png" : "jpg";
      const photoPath = `${safeStudentId}/${submissionId}.${fileExtension}`;
      const upload = await supabase.storage
        .from("recruitment-photos")
        .upload(photoPath, photo, { contentType: photo.type, upsert: false });

      if (upload.error) {
        throw new Error(`Photo upload failed: ${upload.error.message}`);
      }
      uploadedPhoto = true;

      const insert = await supabase.from("recruitment_submissions").insert({
        id: submissionId,
        full_name: fields.fullName.trim(),
        student_id: fields.studentId.trim(),
        department: fields.department,
        whatsapp_num: fields.whatsapp.trim(),
        email: fields.email.trim(),
        photo_path: photoPath,
        segments: chosenSegments,
        other_interest: includesOtherInterest ? otherInterest.trim() : null,
        xp_earned: xp,
        status: "PENDING",
      });

      if (insert.error) {
        throw new Error(`Application save failed: ${insert.error.message}`);
      }

      const newReceipt = {
        id: submissionId,
        fields: { ...fields },
        segments: [...selectedInterests],
        photoUrl: photoDataUrl,
        xp,
      };
      setReceipt(newReceipt);
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        const confetti = (await import("canvas-confetti")).default;
        confetti({
          particleCount: 120,
          spread: 72,
          origin: { y: 0.64 },
          colors: ["#241d23", "#a5e6b5", "#e7a7bc", "#fbfaf9"],
        });
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : "An unexpected error occurred.";
      const photoNote = uploadedPhoto
        ? " The photo upload completed, but the application record was not saved. Contact NCC before retrying."
        : "";
      setSubmissionError(`${detail}${photoNote}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function downloadApplicationPdf(application: ApplicationReceipt) {
    setPdfError("");
    try {
      const doc = await createApplicationPdf(application, loadImageDataUrl);
      const fileSafeId = application.fields.studentId.replace(/[^a-zA-Z0-9_-]/g, "_");
      doc.save(`NCC_Recruitment_${fileSafeId}.pdf`);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "An unexpected error occurred.";
      setPdfError(`PDF download failed: ${detail}`);
    }
  }

  function closeReceipt() {
    receiptDialogRef.current?.close();
  }

  async function openAdminDialog() {
    setAdminError("");
    adminDialogRef.current?.showModal();
    try {
      const { data, error } = await getSupabaseClient().auth.getSession();
      if (error) throw error;
      setAdminUserEmail(data.session?.user.email ?? "");
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : "Could not check your admin session.");
    }
  }

  async function downloadAdminCsv() {
    setAdminBusy(true);
    setAdminError("");
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      const token = data.session?.access_token;
      if (!token) throw new Error("Sign in with the authorized admin account first.");

      const response = await fetch("/api/admin/export", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "CSV export failed.");
      }

      const file = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = file;
      link.download = "ncc-recruitment-applications.csv";
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(file), 1000);
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : "CSV export failed.");
    } finally {
      setAdminBusy(false);
    }
  }

  async function signInAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAdminBusy(true);
    setAdminError("");
    try {
      const { data, error } = await getSupabaseClient().auth.signInWithPassword({
        email: adminEmail.trim(),
        password: adminPassword,
      });
      if (error) throw error;
      if (!data.user) throw new Error("Sign-in did not return an admin user.");
      setAdminEmail(data.user.email ?? adminEmail.trim());
      setAdminUserEmail(data.user.email ?? adminEmail.trim());
      setAdminPassword("");
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : "Admin sign-in failed.");
    } finally {
      setAdminBusy(false);
    }
  }

  async function signOutAdmin() {
    setAdminBusy(true);
    setAdminError("");
    try {
      const { error } = await getSupabaseClient().auth.signOut();
      if (error) throw error;
      setAdminPassword("");
      setAdminEmail("");
      setAdminUserEmail("");
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : "Could not sign out.");
    } finally {
      setAdminBusy(false);
    }
  }

  return (
    <div className="site-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="NITER Computer Club recruitment home">
          <span className="brand-mark"><img src="/images/ncc-logo.png" alt="" /></span>
          <span className="brand-copy">
            <strong>NITER Computer Club</strong>
          </span>
        </a>

        <nav className="header-nav" aria-label="Main navigation">
          <a href="#segments">Segments</a>
        </nav>
      </header>

      <main id="top">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-inner section-wrap">
            <div className="hero-copy">
              <span className="hero-kicker">NCC RECRUITMENT · 2026</span>
              <h1 id="hero-title">Find your crew.</h1>
              <p>Pick a path. Build something that matters.</p>
              <a className="primary-button hero-button" href="#apply">
                Start your application <ArrowRight size={16} aria-hidden="true" />
              </a>
            </div>
            <img className="hero-lp-gif" src="/images/unique-lp.gif" alt="" aria-hidden="true" />
          </div>
        </section>

        <section className="segment-section" id="segments" aria-labelledby="segments-title">
          <div className="segment-content section-wrap">
            <a className="explore-ncc-button" href={officialSite} target="_blank" rel="noreferrer">
              Explore the NCC website <ExternalLink size={15} aria-hidden="true" />
            </a>
            <div className="segment-section-heading">
              <div>
                <div className="segment-title-row">
                  <h2 id="segments-title">Pick a path</h2>
                  <img className="path-penguin" src="/images/path-penguin.gif" alt="" aria-hidden="true" />
                </div>
                <p>Choose one or more segments, or add your own interest.</p>
              </div>
              {(chosenSegments.length > 0 || includesOtherInterest) && (
                <span className="segment-selection-count">
                  {chosenSegments.length + Number(includesOtherInterest)} selected
                </span>
              )}
            </div>
            <div
              className="segment-grid"
              role="group"
              aria-label="Choose one or more NCC segments"
              aria-invalid={Boolean(errors.segments)}
              aria-describedby={errors.segments ? "segment-error" : undefined}
            >
              {segments.map((segment) => {
              const selected = chosenSegments.includes(segment.name);
              return (
                <article
                  className={`segment-card${selected ? " segment-card--selected" : ""}`}
                  key={segment.name}
                >
                  <button
                    type="button"
                    className="segment-pick"
                    aria-pressed={selected}
                    aria-label={`${selected ? "Remove" : "Add"} ${segment.name}${selected ? " from" : " to"} your application`}
                    onClick={() => toggleSegment(segment.name)}
                  >
                    <span className="segment-image-wrap">
                      <img src={segment.image} alt="" loading="lazy" />
                      <span className={`segment-check${selected ? " is-selected" : ""}`} aria-hidden="true">
                        {selected && <Check size={15} />}
                      </span>
                    </span>
                    <span className="segment-card-body">
                      <strong>{segment.name}</strong>
                      <span className="segment-summary">{segment.short}</span>
                    </span>
                  </button>
                  <button className="segment-info" type="button" onClick={() => setActiveSegment(segment)} aria-label={`More about ${segment.name}`}>
                    <Info size={15} aria-hidden="true" />
                  </button>
                </article>
              );
              })}
            </div>

            <div className="other-interest">
              <label className={`other-interest-option${includesOtherInterest ? " is-selected" : ""}`}>
                <input
                  type="checkbox"
                  name="other_interest_option"
                  checked={includesOtherInterest}
                  onChange={(event) => {
                    setIncludesOtherInterest(event.target.checked);
                    setErrors((current) => ({
                      ...current,
                      segments: undefined,
                      otherInterest: undefined,
                    }));
                    setMascotTip(event.target.checked
                      ? "Tell me what you’re interested in. You can also select regular segments."
                      : "Pick a segment that sounds fun. You can choose more than one.");
                  }}
                />
                <span className="other-interest-check" aria-hidden="true">
                  {includesOtherInterest && <Check size={14} />}
                </span>
                <span>Other interest</span>
              </label>
              {includesOtherInterest && (
                <div className="field-group other-interest-field">
                  <label htmlFor="other-interest">What are you interested in? <span>*</span></label>
                  <input
                    id="other-interest"
                    name="other_interest"
                    maxLength={120}
                    placeholder="Type your interest"
                    value={otherInterest}
                    onChange={(event) => {
                      setOtherInterest(event.target.value);
                      setErrors((current) => ({ ...current, otherInterest: undefined }));
                    }}
                    aria-invalid={Boolean(errors.otherInterest)}
                    aria-describedby={errors.otherInterest ? "other-interest-error" : undefined}
                  />
                  {errors.otherInterest && (
                    <small id="other-interest-error" className="field-error">{errors.otherInterest}</small>
                  )}
                </div>
              )}
            </div>

            <p id="segment-error" className="segment-error field-error" aria-live="polite">{errors.segments}</p>
          </div>
        </section>

        <section className="application-section" id="apply" aria-labelledby="application-title">
          <div className="application-intro section-wrap">
            <h2 id="application-title">Application</h2>
          </div>
          <div className="application-layout section-wrap">
            <form
              className="application-form"
              onSubmit={submitApplication}
              onFocusCapture={(event) => {
                if (!(event.target instanceof HTMLElement)) return;
                const target = event.target;
                const hints: Record<string, string> = {
                  full_name: "Use the name shown on your student record.",
                  student_id: "The department prefix and -26 are filled automatically. Enter the rest of your student ID digits.",
                  department: "Choose the department listed in your NITER records.",
                  email: "Use an email address you check regularly.",
                  whatsapp: "Include your country code if needed.",
                  photo: "Add a clear JPEG or PNG photo, up to 2 MB.",
                  prior_knowledge_experience: "Share relevant skills, projects, coursework, or experience.",
                  why_join_ncc: "Tell us what motivates you to join NCC.",
                  other_interest: "A short description is perfect—up to 120 characters.",
                  other_interest_option: "You can select other interests and describe them in your own words.",
                };
                const fieldName =
                  target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
                    ? target.name
                    : "";
                setMascotTip(hints[fieldName] ?? "Fill in this detail and I’ll update your preview.");
              }}
              noValidate
            >
              <img
                className="form-cat-sticker"
                src="/images/form-cat-sticker.gif"
                alt=""
                aria-hidden="true"
              />
              <div className="form-heading">
                <h3>Your details</h3>
                <span className="required-note"><span>*</span> Required</span>
              </div>
              <div className="form-completion">
                <div className="form-completion-label">
                  <span>Form completion</span>
                  <strong>{formProgress}%</strong>
                </div>
                <div
                  className="form-completion-track"
                  role="progressbar"
                  aria-label="Required form details completed"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={formProgress}
                >
                  <span className="form-completion-fill" style={{ width: `${formProgress}%` }} />
                  <span
                    className="form-completion-runner"
                    style={{ left: `${formProgress}%` }}
                    aria-hidden="true"
                  >
                    <DinoRunner />
                  </span>
                </div>
              </div>

              <div className="form-section">
                <div className="form-section-heading">
                  <div>
                    <h4>Who are you?</h4>
                  </div>
                </div>
                <div className="field-grid">
                  <div className="field-group field-grid-full">
                    <label htmlFor="full-name">Full name <span>*</span></label>
                    <input
                      id="full-name"
                      name="full_name"
                      required
                      autoComplete="name"
                      placeholder="Your name as it appears on your ID"
                      value={fields.fullName}
                      onChange={(event) => updateField("fullName", event.target.value)}
                      aria-invalid={Boolean(errors.fullName)}
                      aria-describedby={errors.fullName ? "full-name-error" : undefined}
                    />
                    {errors.fullName && <small id="full-name-error" className="field-error">{errors.fullName}</small>}
                  </div>
                  <div className="field-group">
                    <label htmlFor="student-id">Student ID <span>*</span></label>
                    <input
                      id="student-id"
                      name="student_id"
                      required
                      maxLength={50}
                      pattern="[A-Za-z]{2}-26[0-9]+"
                      autoCapitalize="characters"
                      autoComplete="off"
                      placeholder={`${departmentIdPrefixes[fields.department] ?? "CS"}-2607001`}
                      value={fields.studentId}
                      onChange={(event) => updateField("studentId", event.target.value)}
                      aria-invalid={Boolean(errors.studentId)}
                      aria-describedby={errors.studentId ? "student-id-error" : undefined}
                    />
                    <small className="field-help">
                      Your department prefix and -26 are filled automatically. Enter the remaining ID digits.
                    </small>
                    {errors.studentId && <small id="student-id-error" className="field-error">{errors.studentId}</small>}
                  </div>
                  <div className="field-group">
                    <label htmlFor="email">Email address <span>*</span></label>
                    <div className="input-with-icon">
                      <Mail size={15} aria-hidden="true" />
                      <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        autoComplete="email"
                        placeholder="you@example.com"
                        value={fields.email}
                        onChange={(event) => updateField("email", event.target.value)}
                        aria-invalid={Boolean(errors.email)}
                        aria-describedby={errors.email ? "email-error" : undefined}
                      />
                    </div>
                    {errors.email && <small id="email-error" className="field-error">{errors.email}</small>}
                  </div>
                </div>
              </div>

              <div className="form-section">
                <div className="form-section-heading">
                  <div>
                    <h4>Where do you study?</h4>
                  </div>
                </div>
                <fieldset
                  className="department-fieldset"
                  aria-describedby={errors.department ? "department-error" : undefined}
                >
                  <legend className="sr-only">Choose your department</legend>
                  <div className="department-grid">
                    {departments.map((department) => (
                      <label
                        className={`department-option${fields.department === department.code ? " is-selected" : ""}`}
                        key={department.code}
                      >
                        <input
                          type="radio"
                          name="department"
                          value={department.code}
                          required
                          checked={fields.department === department.code}
                          onChange={(event) => {
                            updateField("department", event.target.value);
                          }}
                        />
                        <span className="radio-indicator" aria-hidden="true">
                          {fields.department === department.code && <Check size={11} />}
                        </span>
                        <span>
                          <strong>{department.label}</strong>
                          <small title={department.name}>{department.name}</small>
                        </span>
                      </label>
                    ))}
                  </div>
                  {errors.department && <small id="department-error" className="field-error">{errors.department}</small>}
                </fieldset>
              </div>

              <div className="form-section">
                <div className="form-section-heading">
                  <div>
                    <h4>How can we reach you?</h4>
                  </div>
                </div>
                <div className="field-group">
                  <label htmlFor="whatsapp">WhatsApp number <span>*</span></label>
                  <input
                    id="whatsapp"
                    name="whatsapp"
                    type="tel"
                    required
                    autoComplete="tel"
                    inputMode="tel"
                    placeholder="+880 1XXX-XXXXXX"
                    value={fields.whatsapp}
                    onChange={(event) => updateField("whatsapp", event.target.value)}
                    aria-invalid={Boolean(errors.whatsapp)}
                    aria-describedby={errors.whatsapp ? "whatsapp-error" : "whatsapp-help"}
                  />
                  <small id="whatsapp-help" className="field-help">Include your country code if you use one.</small>
                  {errors.whatsapp && <small id="whatsapp-error" className="field-error">{errors.whatsapp}</small>}
                </div>
              </div>

              <div className="form-section">
                <div className="form-section-heading">
                  <div>
                    <h4>Tell us a little more</h4>
                  </div>
                </div>
                <div className="written-response-fields">
                  <div className="field-group">
                    <label htmlFor="prior-knowledge-experience">Prior Knowledge &amp; Experience</label>
                    <textarea
                      id="prior-knowledge-experience"
                      name="prior_knowledge_experience"
                      maxLength={200}
                      rows={4}
                      placeholder="Share any relevant skills, projects, coursework, or experience."
                      value={fields.priorKnowledgeExperience}
                      onChange={(event) => updateField("priorKnowledgeExperience", event.target.value)}
                    />
                    <small className="field-help">Optional · Up to 200 characters</small>
                  </div>
                  <div className="field-group">
                    <label htmlFor="why-join-ncc">Why Join NITER Computer Club?</label>
                    <textarea
                      id="why-join-ncc"
                      name="why_join_ncc"
                      maxLength={200}
                      rows={4}
                      placeholder="Tell us what interests you about joining NCC."
                      value={fields.whyJoinNcc}
                      onChange={(event) => updateField("whyJoinNcc", event.target.value)}
                    />
                    <small className="field-help">Optional · Up to 200 characters</small>
                  </div>
                </div>
              </div>

              <div className="form-section">
                <div className="form-section-heading">
                  <div>
                    <h4>Add a photo</h4>
                  </div>
                </div>
                <label
                  className={`upload-zone${photoPreview ? " upload-zone--ready" : ""}${errors.photo ? " upload-zone--error" : ""}`}
                  htmlFor="photo-upload"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    acceptPhoto(event.dataTransfer.files[0]);
                  }}
                >
                  <input
                    id="photo-upload"
                    type="file"
                    name="photo"
                    required
                    accept="image/jpeg,image/png"
                    onChange={(event) => {
                      acceptPhoto(event.target.files?.[0]);
                      event.currentTarget.value = "";
                    }}
                    aria-invalid={Boolean(errors.photo)}
                    aria-describedby={errors.photo ? "photo-help photo-error" : "photo-help"}
                  />
                  {photoPreview ? (
                    <>
                      <img className="photo-preview" src={photoPreview} alt="Preview of your selected application photo" />
                      <span className="upload-copy">
                        <strong>{photo?.name}</strong>
                        <small>Photo ready. Choose another file to replace it.</small>
                      </span>
                      <CheckCircle2 className="upload-status-icon" size={20} aria-hidden="true" />
                    </>
                  ) : (
                    <>
                      <span className="upload-icon"><Upload size={19} aria-hidden="true" /></span>
                      <span className="upload-copy">
                        <strong>Drop your photo here, or <u>browse</u></strong>
                        <small>JPEG or PNG · Maximum file size 2 MB</small>
                      </span>
                    </>
                  )}
                </label>
                <small id="photo-help" className="field-help">
                  JPEG or PNG · Maximum 2 MB · Only the recruitment team can access your photo.
                </small>
                {errors.photo && <small id="photo-error" className="field-error">{errors.photo}</small>}
              </div>

              <div className="privacy-note">
                <ShieldCheck size={17} aria-hidden="true" />
                <p>Your details and photo are private and accessible only to the recruitment team.</p>
              </div>

              {submissionError && (
                <p className="submit-error" role="alert">{submissionError}</p>
              )}

              <button className="primary-button submit-button" type="submit" disabled={isSubmitting}>
                <img className="submit-cat-sticker" src="/images/submit-cat.gif" alt="" aria-hidden="true" />
                {isSubmitting ? (
                  <><span className="loading-spinner" aria-hidden="true" /> Sending your application…</>
                ) : (
                  <>Submit application <ArrowRight size={17} aria-hidden="true" /></>
                )}
              </button>
            </form>
            <LiveApplicationPreview
              fields={fields}
              photoUrl={photoPreview}
              selectedSegments={chosenSegments}
              includesOtherInterest={includesOtherInterest}
              otherInterest={otherInterest}
            />
          </div>
        </section>

        <footer className="site-footer">
          <a className="brand footer-brand" href="#top">
            <span className="brand-mark"><img src="/images/ncc-logo.png" alt="" /></span>
            <span className="brand-copy">
              <strong>NITER COMPUTER CLUB</strong>
              <small>BUILD WHAT'S NEXT.</small>
            </span>
          </a>
          <a className="footer-official" href={officialSite} target="_blank" rel="noreferrer">
            nitercomputerclub.tech <ExternalLink size={13} aria-hidden="true" />
          </a>
          <span className="footer-copyright">© NCC 2026</span>
          <button className="footer-admin-button" type="button" onClick={() => void openAdminDialog()}>
            Admin CSV
          </button>
        </footer>
      </main>

      <MascotGuide tip={mascotTip} setTip={setMascotTip} />

      <dialog
        className="detail-dialog admin-dialog"
        ref={adminDialogRef}
        aria-labelledby="admin-dialog-title"
        onClick={(event) => {
          if (event.target === adminDialogRef.current) adminDialogRef.current?.close();
        }}
      >
        <div className="dialog-content">
          <div className="dialog-topline">
            <div>
              <p className="eyebrow">PRIVATE ADMIN ACCESS</p>
              <h2 id="admin-dialog-title">Applicant data</h2>
            </div>
            <button
              className="icon-button"
              type="button"
              onClick={() => adminDialogRef.current?.close()}
              aria-label="Close admin access"
            >
              <X size={19} />
            </button>
          </div>
          <p className="admin-dialog-copy">Only the authorized admin account can export applicant details. The CSV contains private personal data.</p>
          {adminUserEmail ? (
            <div className="admin-session">
              <p>Signed in as <strong>{adminUserEmail}</strong></p>
              <button className="primary-button admin-download" type="button" onClick={() => void downloadAdminCsv()} disabled={adminBusy}>
                <Download size={16} aria-hidden="true" />
                {adminBusy ? "Preparing CSV…" : "Download all applicant data"}
              </button>
              <button className="receipt-dismiss" type="button" onClick={() => void signOutAdmin()} disabled={adminBusy}>Sign out</button>
            </div>
          ) : (
            <form className="admin-login-form" onSubmit={signInAdmin}>
              <div className="field-group">
                <label htmlFor="admin-email">Admin email</label>
                <input
                  id="admin-email"
                  type="email"
                  autoComplete="username"
                  required
                  value={adminEmail}
                  onChange={(event) => setAdminEmail(event.target.value)}
                />
              </div>
              <div className="field-group">
                <label htmlFor="admin-password">Password</label>
                <input
                  id="admin-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={adminPassword}
                  onChange={(event) => setAdminPassword(event.target.value)}
                />
              </div>
              <button className="primary-button admin-download" type="submit" disabled={adminBusy}>
                {adminBusy ? "Signing in…" : "Sign in"}
              </button>
            </form>
          )}
          {adminError && <p className="submit-error" role="alert">{adminError}</p>}
        </div>
      </dialog>

      <dialog
        className="detail-dialog"
        ref={segmentDialogRef}
        aria-labelledby="segment-dialog-title"
        onClose={() => setActiveSegment(null)}
        onClick={(event) => {
          if (event.target === segmentDialogRef.current) segmentDialogRef.current?.close();
        }}
      >
        {activeSegment && (
          <div className="dialog-content">
            <div className="dialog-topline">
              <span className="pixel-label">SEGMENT {activeSegment.code}</span>
              <button className="icon-button" type="button" onClick={() => segmentDialogRef.current?.close()} aria-label="Close segment details">
                <X size={19} />
              </button>
            </div>
            <h2 id="segment-dialog-title">{activeSegment.name}</h2>
            <p className="dialog-summary">{activeSegment.short}</p>
            <div className="dialog-divider" />
            <p className="segment-description">{activeSegment.description}</p>
            {activeSegment.whatWeDo && (
              <ul className="segment-activities">
                {activeSegment.whatWeDo.map((activity) => <li key={activity}>{activity}</li>)}
              </ul>
            )}
            <div className="dialog-actions">
              <button
                type="button"
                className={`primary-button${chosenSegments.includes(activeSegment.name) ? " button-selected" : ""}`}
                onClick={() => toggleSegment(activeSegment.name)}
              >
                {chosenSegments.includes(activeSegment.name) ? "Remove from application" : "Choose this segment"}
                <ArrowRight size={16} aria-hidden="true" />
              </button>
              <a href={officialSite} target="_blank" rel="noreferrer" className="dialog-official">
                Learn More on Main Site <ExternalLink size={14} aria-hidden="true" />
              </a>
            </div>
          </div>
        )}
      </dialog>

      <dialog
        className="receipt-dialog"
        ref={receiptDialogRef}
        aria-labelledby="receipt-dialog-title"
        onClose={() => setReceipt(null)}
        onClick={(event) => {
          if (event.target === receiptDialogRef.current) closeReceipt();
        }}
      >
        {receipt && (
          <div className="receipt-content">
            <button className="icon-button receipt-close" type="button" onClick={closeReceipt} aria-label="Close your application pass">
              <X size={19} />
            </button>
            <div className="success-mark"><Check size={25} aria-hidden="true" /></div>
            <p className="eyebrow"><span className="eyebrow-line" /> APPLICATION RECEIVED</p>
            <h2 id="receipt-dialog-title">You're on<br /><span>the list.</span></h2>
            <p className="receipt-intro">
              Your application is in. Keep this access pass for your records;
              the NCC team will follow up using your contact details.
            </p>

            <div className="membership-pass">
              <div className="pass-topline">
                <span className="pass-brand">NCC <i>///</i> MEMBER ACCESS</span>
                <span className="pass-status"><span className="status-dot" /> PENDING REVIEW</span>
              </div>
              <div className="pass-main">
                <img src={receipt.photoUrl} alt="" />
                <div>
                  <small>APPLICANT</small>
                  <strong>{receipt.fields.fullName}</strong>
                  <span>{receipt.fields.studentId} · {receipt.fields.department}</span>
                </div>
              </div>
              <div className="pass-bottom">
                <span>REF. {receipt.id.slice(0, 8).toUpperCase()}</span>
                <span>{receipt.xp} XP EARNED</span>
              </div>
            </div>

            <div className="receipt-segments">
              <span className="pixel-label">YOUR INTERESTS</span>
              <p>{receipt.segments.join("  /  ")}</p>
            </div>
            <button className="primary-button pdf-button" type="button" onClick={() => downloadApplicationPdf(receipt)}>
              <FileDown size={17} aria-hidden="true" /> Download A4 application PDF
            </button>
            {pdfError && <p className="submit-error" role="alert">{pdfError}</p>}
            <button className="receipt-dismiss" type="button" onClick={closeReceipt}>Close pass</button>
          </div>
        )}
      </dialog>
    </div>
  );
}

export default App;
