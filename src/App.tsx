import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  FileDown,
  Info,
  Mail,
  ShieldCheck,
  Upload,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import type { FormEvent } from "react";
import type { WebGLRenderer } from "three";
import { departments, segments, type Segment } from "./data/segments";
import { getSupabaseClient } from "./lib/supabase";

type Fields = {
  fullName: string;
  studentId: string;
  department: string;
  whatsapp: string;
  email: string;
};

type FieldName = keyof Fields | "photo" | "segments";
type FormErrors = Partial<Record<FieldName, string>>;

type ApplicationReceipt = {
  id: string;
  fields: Fields;
  segments: string[];
  photoUrl: string;
  xp: number;
};

const officialSite = "https://www.nitercomputerclub.tech/";
const initialFields: Fields = {
  fullName: "",
  studentId: "",
  department: "",
  whatsapp: "",
  email: "",
};

function getErrors(
  fields: Fields,
  photo: File | null,
  selectedSegments: string[],
): FormErrors {
  const errors: FormErrors = {};

  if (fields.fullName.trim().length < 2) {
    errors.fullName = "Enter your full name (at least 2 characters).";
  }
  if (fields.studentId.trim().length < 2) {
    errors.studentId = "Enter your NITER student ID.";
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
  if (selectedSegments.length === 0) {
    errors.segments = "Choose at least one segment.";
  }

  return errors;
}

function calculateXp(fields: Fields, photo: File | null, chosen: string[]) {
  const milestones = [
    fields.fullName.trim().length >= 2,
    fields.studentId.trim().length >= 2,
    Boolean(fields.department),
    /^[+()\d\s-]+$/.test(fields.whatsapp.trim()) &&
      fields.whatsapp.replace(/\D/g, "").length >= 8 &&
      fields.whatsapp.replace(/\D/g, "").length <= 15,
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim()),
    Boolean(photo),
    chosen.length > 0,
  ];

  return Math.min(milestones.filter(Boolean).length * 15, 100);
}

function playTone(enabled: boolean, frequency = 660) {
  if (!enabled || !("AudioContext" in window)) return;

  const context = new AudioContext();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "square";
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.035, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.12);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.12);
  oscillator.addEventListener("ended", () => void context.close(), { once: true });
}

function ByteBot({ energy = 0 }: { energy?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [webglUnavailable, setWebglUnavailable] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    let cleanup = () => {};

    void import("three")
      .then((THREE) => {
        if (cancelled) return;

        let renderer: WebGLRenderer;
        try {
          renderer = new THREE.WebGLRenderer({
            canvas,
            alpha: true,
            antialias: true,
          });
        } catch {
          setWebglUnavailable(true);
          return;
        }

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
        camera.position.set(0, 0, 6.4);

        const robot = new THREE.Group();
        scene.add(robot);

        scene.add(new THREE.HemisphereLight(0xa4eaff, 0x101a37, 2.1));
        const keyLight = new THREE.PointLight(0x2f71e8, 22, 14);
        keyLight.position.set(-3, 3, 4);
        scene.add(keyLight);
        const rimLight = new THREE.PointLight(0x76c84b, 14, 10);
        rimLight.position.set(3, -1, -2);
        scene.add(rimLight);

        const shell = new THREE.Mesh(
          new THREE.BoxGeometry(1.75, 1.55, 1.25, 4, 4, 4),
          new THREE.MeshStandardMaterial({
            color: 0x111c31,
            metalness: 0.72,
            roughness: 0.28,
            emissive: 0x081a2b,
          }),
        );
        robot.add(shell);

        const edges = new THREE.LineSegments(
          new THREE.EdgesGeometry(shell.geometry),
          new THREE.LineBasicMaterial({ color: 0x49d9ed, transparent: true, opacity: 0.8 }),
        );
        robot.add(edges);

        const eye = new THREE.Mesh(
          new THREE.SphereGeometry(0.2, 24, 24),
          new THREE.MeshStandardMaterial({
            color: 0x9efff2,
            emissive: 0x19d7ee,
            emissiveIntensity: 3.5,
            metalness: 0.2,
            roughness: 0.12,
          }),
        );
        eye.position.set(0.08, 0.05, 0.68);
        robot.add(eye);

        const eyeHalo = new THREE.Mesh(
          new THREE.TorusGeometry(0.3, 0.018, 8, 48),
          new THREE.MeshBasicMaterial({ color: 0x76c84b }),
        );
        eyeHalo.position.copy(eye.position);
        robot.add(eyeHalo);

        const orbit = new THREE.Mesh(
          new THREE.TorusGeometry(1.48, 0.012, 8, 100),
          new THREE.MeshBasicMaterial({ color: 0x2f71e8, transparent: true, opacity: 0.9 }),
        );
        orbit.rotation.set(0.92, 0.16, -0.28);
        robot.add(orbit);

        const secondOrbit = new THREE.Mesh(
          new THREE.TorusGeometry(1.72, 0.008, 8, 100),
          new THREE.MeshBasicMaterial({ color: 0x76c84b, transparent: true, opacity: 0.7 }),
        );
        secondOrbit.rotation.set(0.35, -0.62, 0.22);
        robot.add(secondOrbit);

        const pixel = new THREE.Mesh(
          new THREE.BoxGeometry(0.11, 0.11, 0.11),
          new THREE.MeshBasicMaterial({ color: 0x76c84b }),
        );
        pixel.position.set(1.05, 0.8, 0.15);
        robot.add(pixel);

        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setClearColor(0x000000, 0);
        const resizeObserver = new ResizeObserver(() => {
          const { width, height } = canvas.getBoundingClientRect();
          if (!width || !height) return;
          renderer.setSize(width, height, false);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
        });
        resizeObserver.observe(canvas);

        let frame = 0;
        let animationFrame = 0;
        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const render = () => {
          if (!reducedMotion) {
            frame += 0.008;
            robot.position.y = Math.sin(frame) * 0.055;
            robot.rotation.y += 0.0018;
          }
          eye.scale.setScalar(1 + Math.sin(frame * 1.6) * 0.035);
          renderer.render(scene, camera);
          if (!reducedMotion) animationFrame = window.requestAnimationFrame(render);
        };
        render();

        let dragging = false;
        let previousX = 0;
        let previousY = 0;
        const onPointerDown = (event: PointerEvent) => {
          dragging = true;
          previousX = event.clientX;
          previousY = event.clientY;
          canvas.setPointerCapture(event.pointerId);
        };
        const onPointerMove = (event: PointerEvent) => {
          if (!dragging) return;
          robot.rotation.y += (event.clientX - previousX) * 0.008;
          robot.rotation.x += (event.clientY - previousY) * 0.008;
          previousX = event.clientX;
          previousY = event.clientY;
          if (reducedMotion) renderer.render(scene, camera);
        };
        const onPointerUp = () => {
          dragging = false;
        };
        canvas.addEventListener("pointerdown", onPointerDown);
        canvas.addEventListener("pointermove", onPointerMove);
        canvas.addEventListener("pointerup", onPointerUp);
        canvas.addEventListener("pointercancel", onPointerUp);

        cleanup = () => {
          window.cancelAnimationFrame(animationFrame);
          resizeObserver.disconnect();
          canvas.removeEventListener("pointerdown", onPointerDown);
          canvas.removeEventListener("pointermove", onPointerMove);
          canvas.removeEventListener("pointerup", onPointerUp);
          canvas.removeEventListener("pointercancel", onPointerUp);
          scene.traverse((object) => {
            if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {
              object.geometry.dispose();
              const materials = Array.isArray(object.material) ? object.material : [object.material];
              materials.forEach((material) => material.dispose());
            }
          });
          renderer.dispose();
        };
      })
      .catch(() => {
        if (!cancelled) setWebglUnavailable(true);
      });

    return () => {
      cancelled = true;
      cleanup();
    };
  }, []);

  return (
    <div className={`bytebot-stage${energy ? " bytebot-stage--active" : ""}`}>
      <div className="bytebot-orbit-label">
        <span className="status-dot" />
        BYTE-BOT <span className="muted-code">/ ONLINE</span>
      </div>
      {webglUnavailable ? (
        <div className="bytebot-fallback" role="img" aria-label="Byte-Bot, the NCC application assistant">
          <div className="fallback-orbit">
            <div className="fallback-bot"><span /></div>
          </div>
        </div>
      ) : (
        <canvas
          ref={canvasRef}
          className="bytebot-canvas"
          aria-label="Interactive 3D Byte-Bot mascot. Drag to rotate."
          role="img"
        />
      )}
      <p className="bytebot-caption">
        {energy > 0 ? "NICE WORK, RECRUIT." : "YOUR BUILD PARTNER IS READY."}
      </p>
      <span className="bot-coordinate">NCC · BB-01</span>
    </div>
  );
}

function App() {
  const [fields, setFields] = useState<Fields>(initialFields);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [photoDataUrl, setPhotoDataUrl] = useState("");
  const [chosenSegments, setChosenSegments] = useState<string[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submissionError, setSubmissionError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [activeSegment, setActiveSegment] = useState<Segment | null>(null);
  const [receipt, setReceipt] = useState<ApplicationReceipt | null>(null);
  const [pdfError, setPdfError] = useState("");
  const segmentDialogRef = useRef<HTMLDialogElement>(null);
  const receiptDialogRef = useRef<HTMLDialogElement>(null);

  const xp = useMemo(
    () => calculateXp(fields, photo, chosenSegments),
    [fields, photo, chosenSegments],
  );
  const completionCount = useMemo(
    () => 7 - Object.values(getErrors(fields, photo, chosenSegments)).length,
    [fields, photo, chosenSegments],
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
    setFields((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
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
    if (file.size > 5 * 1024 * 1024) {
      setPhoto(null);
      setPhotoPreview("");
      setPhotoDataUrl("");
      setErrors((current) => ({
        ...current,
        photo: "Your photo must be 5 MB or smaller.",
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
    playTone(soundEnabled, chosenSegments.includes(name) ? 390 : 740);
  }

  async function submitApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = getErrors(fields, photo, chosenSegments);
    setErrors(nextErrors);
    setSubmissionError("");

    if (Object.keys(nextErrors).length > 0) {
      document.querySelector<HTMLElement>(".field-error")?.scrollIntoView({
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
        .from("student-photos")
        .upload(photoPath, photo, { contentType: photo.type, upsert: false });

      if (upload.error) {
        throw new Error(`Photo upload failed: ${upload.error.message}`);
      }
      uploadedPhoto = true;

      const photoUrl = supabase.storage.from("student-photos").getPublicUrl(photoPath).data.publicUrl;
      const insert = await supabase.from("recruitment_submissions").insert({
        id: submissionId,
        full_name: fields.fullName.trim(),
        student_id: fields.studentId.trim(),
        department: fields.department,
        whatsapp_num: fields.whatsapp.trim(),
        email: fields.email.trim(),
        photo_url: photoUrl,
        segments: chosenSegments,
        xp_earned: xp,
        status: "PENDING",
      });

      if (insert.error) {
        throw new Error(`Application save failed: ${insert.error.message}`);
      }

      const newReceipt = {
        id: submissionId,
        fields: { ...fields },
        segments: [...chosenSegments],
        photoUrl,
        xp,
      };
      setReceipt(newReceipt);
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        const confetti = (await import("canvas-confetti")).default;
        confetti({
          particleCount: 120,
          spread: 72,
          origin: { y: 0.64 },
          colors: ["#2f71e8", "#76c84b", "#ff2353", "#f4f7ff"],
        });
      }
      playTone(soundEnabled, 880);
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
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 18;
    const textWidth = pageWidth - margin * 2 - 34;

    doc.setFillColor(11, 15, 25);
    doc.rect(0, 0, pageWidth, 42, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("NITER COMPUTER CLUB", margin, 18);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(161, 178, 204);
    doc.text("OFFICIAL RECRUITMENT APPLICATION · SESSION 2026", margin, 26);
    doc.setTextColor(118, 200, 75);
    doc.setFont("helvetica", "bold");
    doc.text(`REF. ${application.id.slice(0, 8).toUpperCase()}`, margin, 34);

    const imageFormat = photoDataUrl.startsWith("data:image/png") ? "PNG" : "JPEG";
    doc.addImage(photoDataUrl, imageFormat, pageWidth - margin - 27, 8, 27, 29);
    doc.setTextColor(24, 37, 59);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("APPLICANT DETAILS", margin, 56);
    doc.setDrawColor(47, 113, 232);
    doc.setLineWidth(0.7);
    doc.line(margin, 59, pageWidth - margin, 59);

    const rows = [
      ["Full name", application.fields.fullName],
      ["Student ID", application.fields.studentId],
      ["Department", application.fields.department],
      ["WhatsApp", application.fields.whatsapp],
      ["Email", application.fields.email],
      ["Selected segments", application.segments.join(", ")],
      ["Application status", "PENDING REVIEW"],
      ["Recruit XP", `${application.xp} XP`],
    ];
    let y = 70;
    for (const [label, value] of rows) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(91, 108, 132);
      doc.text(label.toUpperCase(), margin, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(24, 37, 59);
      const wrapped = doc.splitTextToSize(value, textWidth);
      doc.text(wrapped, margin + 43, y);
      y += Math.max(9, wrapped.length * 5.2);
    }

    const footerY = Math.max(y + 28, 258);
    doc.setDrawColor(198, 208, 223);
    doc.setLineDashPattern([1, 1], 0);
    doc.line(margin, footerY, pageWidth - margin, footerY);
    doc.setLineDashPattern([], 0);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(91, 108, 132);
    doc.text(
      "Submitted through the official NITER Computer Club recruitment portal.",
      pageWidth / 2,
      footerY + 8,
      { align: "center" },
    );
    doc.text("Keep this page for your records.", pageWidth / 2, footerY + 13, {
      align: "center",
    });

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

  return (
    <div className="site-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="NITER Computer Club recruitment home">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 40 40" fill="none">
              <path d="M9 29V12l11 15 11-15v17" />
              <path d="M4 20a16 16 0 0 1 31-5" />
              <circle cx="34" cy="11" r="2.2" />
            </svg>
          </span>
          <span className="brand-copy">
            <strong>NITER COMPUTER CLUB</strong>
            <small>RECRUITMENT PORTAL <i>·</i> 2026</small>
          </span>
        </a>

        <nav className="header-nav" aria-label="Main navigation">
          <a href="#segments">Segments</a>
          <a href="#apply">Application</a>
          <a className="official-link" href={officialSite} target="_blank" rel="noreferrer">
            Visit Official Site <ExternalLink size={14} aria-hidden="true" />
          </a>
        </nav>
      </header>

      <main id="top">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow"><span className="eyebrow-line" /> RECRUITMENT · INTAKE 2026</p>
            <h1 id="hero-title">
              Make your
              <br />
              <span>next move</span>
              <span className="title-period">.</span>
            </h1>
            <p className="hero-intro">
              A good idea is only the beginning. Find your people, choose a
              segment, and build something that matters at NITER.
            </p>
            <a className="primary-button hero-button" href="#apply">
              Start your application <ArrowRight size={17} aria-hidden="true" />
            </a>
            <div className="hero-meta">
              <span><ShieldCheck size={15} aria-hidden="true" /> No account needed</span>
              <span className="meta-divider" />
              <span>About 3 minutes</span>
            </div>
          </div>

          <div className="hero-art" aria-label="Meet Byte-Bot, your application companion">
            <div className="hero-art-ring hero-art-ring--one" />
            <div className="hero-art-ring hero-art-ring--two" />
            <span className="art-coordinate art-coordinate--top">23° 53' N / 90° 22' E</span>
            <span className="art-coordinate art-coordinate--bottom">NITER · DHAKA · BD</span>
            <ByteBot energy={xp} />
          </div>

          <a className="scroll-hint" href="#segments">
            <span>SCROLL TO EXPLORE</span>
            <ArrowDown size={14} aria-hidden="true" />
          </a>
          <div className="hero-index" aria-hidden="true">001 — 007</div>
        </section>

        <section className="segment-section section-wrap" id="segments" aria-labelledby="segments-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow"><span className="eyebrow-line" /> FIND YOUR FREQUENCY</p>
              <h2 id="segments-title">Seven ways to <span>make an impact.</span></h2>
            </div>
            <p className="section-aside">
              You don't need to know it all.
              <br />
              Just bring your curiosity.
            </p>
          </div>

          <div
            className="segment-grid"
            role="group"
            aria-label="Choose one or more NCC segments"
            aria-invalid={Boolean(errors.segments)}
            aria-describedby={errors.segments ? "segment-error" : undefined}
          >
            {segments.map((segment, index) => {
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
                    <span className="segment-topline">
                      <span className="segment-code">SEG. {segment.code}</span>
                      <span className={`segment-check${selected ? " is-selected" : ""}`} aria-hidden="true">
                        {selected && <Check size={13} />}
                      </span>
                    </span>
                    <span className="segment-number">0{index + 1}</span>
                    <strong>{segment.name}</strong>
                    <span className="segment-summary">{segment.short}</span>
                    <span className="segment-card-action">
                      {selected ? "Added to application" : "Add this segment"}
                      <ChevronRight size={14} aria-hidden="true" />
                    </span>
                  </button>
                  <button
                    className="segment-info"
                    type="button"
                    onClick={() => setActiveSegment(segment)}
                    aria-label={`Read more about ${segment.name}`}
                  >
                    <Info size={14} aria-hidden="true" />
                    <span>About this segment</span>
                  </button>
                </article>
              );
            })}
          </div>

          <p id="segment-error" className="segment-error field-error" aria-live="polite">{errors.segments}</p>

          <a className="official-callout" href={officialSite} target="_blank" rel="noreferrer">
            <span className="callout-icon" aria-hidden="true"><ExternalLink size={17} /></span>
            <span>
              <strong>Want to see what NCC has built?</strong>
              <small>Explore our achievements and events on the official website.</small>
            </span>
            <span className="callout-action">Explore NCC <ArrowRight size={15} aria-hidden="true" /></span>
          </a>
        </section>

        <section className="application-section" id="apply" aria-labelledby="application-title">
          <div className="application-layout section-wrap">
            <aside className="application-aside">
              <p className="eyebrow"><span className="eyebrow-line" /> YOUR APPLICATION</p>
              <h2 id="application-title">Let's get<br />to know <span>you.</span></h2>
              <p className="aside-copy">
                Fill in your details, upload a photo, and tell us where you want
                to grow. No login, no fuss.
              </p>
              <div className="assistant-panel">
                <div className="assistant-note-header">
                  <span className="status-dot" />
                  BYTE-BOT <span className="muted-code">/ MESSAGE</span>
                </div>
                <p className="assistant-message">
                  {xp === 100
                    ? "ALL SYSTEMS GO. READY TO LAUNCH."
                    : xp > 45
                      ? "LOOKING GOOD. KEEP GOING."
                      : "I'LL BE HERE IF YOU NEED A HAND."}
                </p>
                <p className="assistant-detail">YOUR INFO IS ONLY USED FOR RECRUITMENT.</p>
              </div>
              <div className="progress-card">
                <div className="progress-card-top">
                  <span className="pixel-label">RECRUIT XP</span>
                  <strong><span>{xp}</span><small> / 100</small></strong>
                </div>
                <div
                  className="xp-track"
                  role="progressbar"
                  aria-label="Application completion experience points"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={xp}
                >
                  <span style={{ width: `${xp}%` }} />
                </div>
                <p>{completionCount} OF 7 CHECKPOINTS COMPLETE</p>
                <div className="progress-note">
                  <CheckCircle2 size={15} aria-hidden="true" />
                  <span>Progress updates as you complete the form.</span>
                </div>
              </div>
              <button
                type="button"
                className="sound-toggle"
                aria-pressed={soundEnabled}
                onClick={() => setSoundEnabled((enabled) => !enabled)}
              >
                {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
                Sound effects {soundEnabled ? "on" : "off"}
              </button>
            </aside>

            <form className="application-form" onSubmit={submitApplication} noValidate>
              <div className="form-heading">
                <div>
                  <p className="eyebrow"><span className="eyebrow-line" /> APPLICATION FORM</p>
                  <h3>Your details</h3>
                </div>
                <span className="required-note"><span>*</span> REQUIRED FIELDS</span>
              </div>

              <div className="form-section">
                <div className="form-section-heading">
                  <span className="form-section-index">01</span>
                  <div>
                    <h4>Who are you?</h4>
                    <p>Use the name and ID on your NITER records.</p>
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
                      autoComplete="off"
                      placeholder="e.g. CSE-2024-001"
                      value={fields.studentId}
                      onChange={(event) => updateField("studentId", event.target.value)}
                      aria-invalid={Boolean(errors.studentId)}
                      aria-describedby={errors.studentId ? "student-id-error" : undefined}
                    />
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
                  <span className="form-section-index">02</span>
                  <div>
                    <h4>Where do you study?</h4>
                    <p>Select your academic department.</p>
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
                            playTone(soundEnabled, 550);
                          }}
                        />
                        <span className="radio-indicator" aria-hidden="true">
                          {fields.department === department.code && <Check size={11} />}
                        </span>
                        <span><strong>{department.code}</strong><small>{department.name}</small></span>
                      </label>
                    ))}
                  </div>
                  {errors.department && <small id="department-error" className="field-error">{errors.department}</small>}
                </fieldset>
              </div>

              <div className="form-section">
                <div className="form-section-heading">
                  <span className="form-section-index">03</span>
                  <div>
                    <h4>How can we reach you?</h4>
                    <p>We will only use these details about your application.</p>
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
                  <span className="form-section-index">04</span>
                  <div>
                    <h4>Add a photo</h4>
                    <p>A clear passport-size photo helps us identify your application.</p>
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
                        <small>JPEG or PNG · Maximum file size 5 MB</small>
                      </span>
                    </>
                  )}
                </label>
                <small id="photo-help" className="field-help">
                  JPEG or PNG · Maximum 5 MB · Photo is stored in a public bucket.
                </small>
                {errors.photo && <small id="photo-error" className="field-error">{errors.photo}</small>}
              </div>

              <div className="form-section selected-summary">
                <div className="form-section-heading">
                  <span className="form-section-index">05</span>
                  <div>
                    <h4>Your selected segments</h4>
                    <p>{chosenSegments.length ? `${chosenSegments.length} selected` : "Choose segments above that you are excited to explore."}</p>
                  </div>
                </div>
                {chosenSegments.length > 0 && (
                  <ul className="selected-pills" aria-label="Selected segments">
                    {chosenSegments.map((name) => (
                      <li key={name}><Check size={12} aria-hidden="true" /> {name}</li>
                    ))}
                  </ul>
                )}
                <a className="back-to-segments" href="#segments">
                  {chosenSegments.length ? "Edit segment selection" : "Explore the seven segments"}
                  <ArrowRight size={14} aria-hidden="true" />
                </a>
              </div>

              <div className="privacy-note">
                <ShieldCheck size={17} aria-hidden="true" />
                <p>
                  Your details go to NITER Computer Club for recruitment review.
                  The uploaded photo is publicly viewable by its URL, so submit
                  only an image you are comfortable sharing. By submitting, you
                  confirm the information above is accurate.
                </p>
              </div>

              {submissionError && (
                <p className="submit-error" role="alert">{submissionError}</p>
              )}

              <button className="primary-button submit-button" type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <><span className="loading-spinner" aria-hidden="true" /> Sending your application…</>
                ) : (
                  <>Submit application <ArrowRight size={17} aria-hidden="true" /></>
                )}
              </button>
              <p className="submit-footnote">NO LOGIN REQUIRED <span>·</span> YOU CAN DOWNLOAD A PDF AFTER SUBMITTING</p>
            </form>
          </div>
        </section>

        <footer className="site-footer">
          <a className="brand footer-brand" href="#top">
            <span className="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 40 40" fill="none">
                <path d="M9 29V12l11 15 11-15v17" />
                <path d="M4 20a16 16 0 0 1 31-5" />
                <circle cx="34" cy="11" r="2.2" />
              </svg>
            </span>
            <span className="brand-copy">
              <strong>NITER COMPUTER CLUB</strong>
              <small>BUILD WHAT'S NEXT.</small>
            </span>
          </a>
          <span className="footer-center">A NEW INTAKE. A NEW CHAPTER.</span>
          <a className="footer-official" href={officialSite} target="_blank" rel="noreferrer">
            nitercomputerclub.tech <ExternalLink size={13} aria-hidden="true" />
          </a>
          <span className="footer-copyright">© NCC 2026</span>
        </footer>
      </main>

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
              <span className="pixel-label">YOUR TRACKS</span>
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
