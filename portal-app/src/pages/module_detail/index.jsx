import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { doc, deleteDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "@/firebase/firebaseConfig";
import "react-quill-new/dist/quill.snow.css";
import useUserData from "@/hooks/useUserData";
import DOMPurify from "dompurify";
import { TYPO } from "@/constants/typography";
import BackButton from "@/components/ui/BackButton";
import EditButton from "@/components/ui/EditButton";
import DeleteButton from "@/components/ui/DeleteButton";
import MetaChipsRow from "@/components/ui/MetaChipsRow";
import { COLLECTIONS } from "@/firebase/collectionNames";
import module1 from "@/assets/modules/module1.png";
import module2 from "@/assets/modules/module2.png";
import module3 from "@/assets/modules/module3.png";
import module4 from "@/assets/modules/module4.png";
import module5 from "@/assets/modules/module5.png";
import { loadStripe } from "@stripe/stripe-js";
import { fetchPayments } from "@/utils/paymentsApi";
import { api } from "@/utils/apiClient";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";
import { toUserMessage } from "@/utils/errorMessage";
import Loading from "@/components/ui/Loading";
import { ROLES } from "@/constants/roles";
import { FEATURED_MODULES } from "@/constants/featuredModules";


// Level chip coloring intentionally not used on module page

// Import default images for fallback - using module images instead since AI images don't exist
// If you have these AI images in a different location, update the paths accordingly

const fallbackStripeKey = String(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "").trim();
if (!fallbackStripeKey) {
  console.error("Missing VITE_STRIPE_PUBLISHABLE_KEY (fallback)");
}

const imageMap = {
  module1,
  module2,
  module3,
  module4,
  module5,
};

const getDetailValue = (details, label) => {
  const target = String(label || "").trim().toLowerCase();
  const item = (details || []).find((d) => String(d?.label || "").trim().toLowerCase() === target);
  return item?.value ?? "";
};

const formatDurationShort = (durationValue) => {
  const raw = String(durationValue || "").trim();
  if (!raw) return "—";
  const match = raw.match(/(\d+)/);
  if (match) return `${match[1]} min`;
  return raw;
};

const normalizeLessonDuration = (durationValue) => {
  if (durationValue === null || durationValue === undefined || durationValue === "") return "";
  if (typeof durationValue === "number") return `${durationValue} minutes`;
  const s = String(durationValue).trim();
  if (!s) return "";
  if (/\bmin\b|\bminute\b/i.test(s)) return s;
  const match = s.match(/^\d+$/);
  if (match) return `${s} minutes`;
  return s;
};

const extractBulletsFromObjectives = (value) => {
  const html = String(value || "");
  if (!html.trim()) return [];

  // If it's HTML with list items, don't try to parse; we'll render sanitized HTML.
  if (/<\s*li\b/i.test(html)) return null;

  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return [];

  // Prefer newline/semicolon splits
  const newlineParts = text.split(/\n+/).map((s) => s.trim()).filter(Boolean);
  if (newlineParts.length > 1) return newlineParts;

  const semiParts = text.split(/\s*;\s*/).map((s) => s.trim()).filter(Boolean);
  if (semiParts.length > 1) return semiParts;

  // Fallback: split into sentences if there are multiple.
  const sentenceParts = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return sentenceParts.length > 1 ? sentenceParts : [text];
};


const ModuleDetail = () => {
  const toast = useToast();
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { userData } = useUserData();
  const [checkoutClientSecret, setCheckoutClientSecret] = useState(null);
  const [checkoutStripeKey, setCheckoutStripeKey] = useState(null);
  const [showPurchaseSuccess, setShowPurchaseSuccess] = useState(false);
  const checkoutInitRef = useRef(null);
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);


  const returnTo = (location.state && location.state.returnTo) || null;

  // Show confirmation after Stripe redirects back from checkout.
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search || "");
      const checkoutFlag = params.get("checkout");
      const redirectStatus = params.get("redirect_status");
      const sessionId = params.get("session_id");

      if (checkoutFlag === "success" && (redirectStatus === "succeeded" || !!sessionId)) {
        // If Stripe redirected back, ensure checkout modal is closed
        // so we don't keep two modals open at once.
        // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing, see #525
        setCheckoutClientSecret(null);
        setCheckoutStripeKey(null);
        checkoutInitRef.current = null;
        setShowPurchaseSuccess(true);
      }
    } catch (e) {
      console.error("Failed to parse checkout return params:", e);
    }
  }, [location.search]);

  // Ensure we start at top when navigating here
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [moduleId]);

  // Module data states
  const [moduleData, setModuleData] = useState(null);
  // True when this is a paid module the viewer has not purchased (#430).
  const [moduleLocked, setModuleLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const descRef = useRef(null);
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [showDescMore, setShowDescMore] = useState(false);

  // Reset description expansion when module changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing, see #525
    setIsDescExpanded(false);
    setShowDescMore(false);
  }, [moduleId]);

  const fetchLessonDetails = useCallback(async (ids) => {
    try {
      const stripHtmlToText = (html) => {
        if (!html || typeof html !== "string") return "";
        return html
          .replace(/<[^>]*>/g, " ")
          .replace(/&nbsp;/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#039;/g, "'")
          .replace(/\s+/g, " ")
          .trim();
      };

      // Fetch lesson plans from backend API
      const lessonPlanRequests = ids.map(async (id) => {
        try {
          return await api.get(`/api/lesson/${id}`);
        } catch (error) {
          // A non-2xx throws now, so the old !response.ok branch folds in here.
          console.error(`Error fetching lesson ${id}:`, error);
          return null;
        }
      });

      const responses = await Promise.all(lessonPlanRequests);
      const fetchedPlans = responses.filter(plan => plan !== null);

      // Transform lessons for display
      const resources = fetchedPlans.map(lesson => ({
        title: lesson.title || "Untitled Lesson",
        desc: stripHtmlToText(lesson.description) || "No description",
        type: Array.isArray(lesson.type) ? lesson.type.join(", ") : lesson.type || "Lesson Plan",
        level: Array.isArray(lesson.level) ? lesson.level.join(", ") : lesson.level || "—",
        duration: lesson.duration || "—",
        sectionsCount: Array.isArray(lesson.sections) ? lesson.sections.length : 0,
        locked: false,
        id: lesson.id
      }));

      // Update moduleData with resources
      setModuleData(prev => ({
        ...prev,
        resources: resources
      }));

    } catch (error) {
      console.error("Error fetching lesson details:", error);
    }
  }, []);

  // Determine if the header description exceeds 3 lines (only when collapsed).
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!moduleData) return;
    if (isDescExpanded) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing, see #525
      setShowDescMore(false);
      return;
    }
    if (!descRef.current) return;

    const el = descRef.current;
    const raf = window.requestAnimationFrame(() => {
      try {
        setShowDescMore(el.scrollHeight > el.clientHeight + 1);
      } catch {
        setShowDescMore(false);
      }
    });
    return () => window.cancelAnimationFrame(raf);
  }, [moduleId, moduleData, moduleData?.subtitle, isDescExpanded]);

  const fetchModuleDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if it's a hardcoded module first
      if (FEATURED_MODULES[moduleId]) {
        const hardcodedData = FEATURED_MODULES[moduleId];
        setModuleData(hardcodedData);
        setLoading(false);
        return;
      }

      // Fetch through the API so the server can withhold a paid module's
      // lessons from anyone without an entitlement (#430). The client SDK
      // cannot make that decision. This became usable once #427 aligned the
      // collection qualifier — before that the API looked in `prod_module`
      // and found nothing.
      let data;
      try {
        data = await api.get(`/api/module/${moduleId}`);
      } catch (err) {
        // "not found" stays distinguishable from every other failure, which
        // is why this is a status check rather than one generic message.
        setError(err?.status === 404 ? "Module not found" : "Could not load this module. Please try again.");
        setLoading(false);
        return;
      }
      const isLocked = data.locked === true;
      setModuleLocked(isLocked);
      const authorUid = data.author || data.authorId || "";
      const isFeatured = data.isFeatured === true;
      const priceRaw = data.price ?? data.Price ?? 0;
      const price = Number.isFinite(Number(priceRaw)) ? Number(priceRaw) : 0;

      // Support both schemas:
      // - legacy/other: { lessonPlans: {0: "<lessonId>", 1: "<lessonId>" ... } }
      // - module builder: { lessons: ["<lessonId>", "<lessonId>", ...] }
      const lessonIdsFromLessonPlans =
        data.lessonPlans && typeof data.lessonPlans === "object" && !Array.isArray(data.lessonPlans)
          ? Object.values(data.lessonPlans).filter(Boolean)
          : [];
      const lessonIdsFromLessons = Array.isArray(data.lessons) ? data.lessons.filter(Boolean) : [];
      const lessonPlanIds = lessonIdsFromLessonPlans.length > 0 ? lessonIdsFromLessonPlans : lessonIdsFromLessons;

      const categoryRaw = data.category ?? data.Category;
      const levelRaw = data.level ?? data.Level;
      const typeRaw = data.type ?? data.Type;
      const durationRaw = data.duration ?? data.Duration;

      // Transform Firestore data to display format
      const transformedData = {
        title: data.title?.toUpperCase() || "UNTITLED MODULE",
        subtitle: data.description || "No description available",
        image: imageMap[data.image] || module1,
        description: data.description || "No description available",
        requirements: data.requirements || "No specific requirements",
        learningObjectives: data.learningObjectives || "Objectives will be defined",
        _meta: { id: moduleId, authorUid, isFeatured, price, locked: isLocked },
        details: [
          { label: "Category", value: Array.isArray(categoryRaw) ? categoryRaw.join(", ") : categoryRaw || "N/A" },
          { label: "Level", value: Array.isArray(levelRaw) ? levelRaw.join(", ") : levelRaw || "N/A" },
          { label: "Type", value: Array.isArray(typeRaw) ? typeRaw.join(", ") : typeRaw || "N/A" },
          {
            label: "Duration",
            value: durationRaw
              ? typeof durationRaw === "string" && durationRaw.toLowerCase().includes("minute")
                ? durationRaw
                : `${durationRaw} minutes`
              : "N/A",
          },
        ],
        resources: [],
      };

      setModuleData(transformedData);

      // A locked module returns no lesson ids at all, so there is nothing to
      // fetch and nothing for the page to render.
      if (!isLocked && lessonPlanIds.length > 0) {
        await fetchLessonDetails(lessonPlanIds);
      }
    } catch (error) {
      console.error("Error fetching module:", error);
      setError("Error loading module data: " + error.message);
    } finally {
      setLoading(false);
    }
  }, [moduleId, fetchLessonDetails]);

  useEffect(() => {
    let cancelled = false;
    if (!checkoutClientSecret) return;
    const stripeKeyToUse = String(checkoutStripeKey || fallbackStripeKey || "").trim();
    if (!stripeKeyToUse) {
      console.error("Missing Stripe publishable key for embedded checkout.");
      return;
    }

    // React 18 StrictMode can run effects twice in dev; guard against double init.
    if (checkoutInitRef.current === checkoutClientSecret) return;
    checkoutInitRef.current = checkoutClientSecret;
  
    let checkout;
  
    (async () => {
      const stripe = await loadStripe(stripeKeyToUse);
      if (cancelled) return;
      if (!stripe) return;
      checkout = await stripe.initEmbeddedCheckout({
        clientSecret: checkoutClientSecret,
        onComplete: () => {
          try {
            setCheckoutClientSecret(null);
            setCheckoutStripeKey(null);
            checkoutInitRef.current = null;
            setShowPurchaseSuccess(true);
          } catch (e) {
            console.error("Embedded checkout onComplete failed:", e);
          }
        },
      });
      checkout.mount("#checkout-container");
    })();
  
    return () => {
      cancelled = true;
      if (checkout) checkout.destroy();
      if (checkoutInitRef.current === checkoutClientSecret) checkoutInitRef.current = null;
    };
  }, [checkoutClientSecret, checkoutStripeKey]);
  

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing, see #525
    if (moduleId) fetchModuleDetails();
  }, [moduleId, fetchModuleDetails]);

  // (legacy layout style helpers removed; Screenshot 2 style is inlined below)

  const handleLessonClick = (resource, index) => {
    if (resource.id) {
      navigate(`/lesson/${resource.id}`, {
        state: {
          returnTo: `${location.pathname}${location.search || ""}`,
          moduleReturnTo: returnTo || null,
        },
      });
      return;
    }
    // Featured/hardcoded modules don't have Firestore lesson IDs; use the legacy lesson route.
    navigate(`/lesson/${moduleId}/${index}`, {
      state: {
        lesson: {
          title: resource.title,
          desc: resource.desc,
          type: resource.type,
          locked: false,
        },
        moduleTitle: moduleData?.title,
        moduleId,
        moduleReturnTo: returnTo || null,
      },
    });
  };

  // Download removed from module lesson cards (per UX request)

  if (loading) {
    return (
      <Loading variant="page" message="Loading module details..." />
    );
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.2rem'
      }}>
        <p>{error}</p>
        <button
          onClick={() => navigate('/teacher-plus')}
          style={{
            marginTop: '20px',
            padding: '10px 20px',
            backgroundColor: '#162040',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Back to Modules
        </button>
      </div>
    );
  }

  // If no module data, show error
  if (!moduleData) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.2rem'
      }}>
        <p>Module not found</p>
        <button
          onClick={() => navigate('/teacher-plus')}
          style={{
            marginTop: '20px',
            padding: '10px 20px',
            backgroundColor: '#162040',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Back to Modules
        </button>
      </div>
    );
  }

  // New beautiful layout for view mode
  const module = moduleData;
  const authUser = getAuth().currentUser;
  const isAdmin = userData?.role === ROLES.ADMIN;
  const isAuthor =
    !!authUser && !!moduleData?._meta?.authorUid && authUser.uid === moduleData._meta.authorUid;
  const canEdit = !FEATURED_MODULES[moduleId] && (isAdmin || isAuthor);
  const handleDeleteModule = async () => {
    try {
      setIsDeleting(true);
      await deleteDoc(doc(db, COLLECTIONS.module, moduleId));
      setIsDeleteModalOpen(false);

      if (window.history.length > 1) {
        navigate(-1);
        return;
      }
      navigate("/");
    } catch (err) {
      console.error("Failed to delete module:", err);
      toast.error(toUserMessage(error, "Failed to delete module. Please try again."));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBuy = async () => {
    if (isStartingCheckout) return;
    if (checkoutClientSecret) return; // already open / initializing
    try {
      setIsStartingCheckout(true);
      const auth = getAuth();
      const user = auth.currentUser;
  
      if (!user) {
        toast.error("Please log in to purchase.");
        return;
      }
  
      const token = await user.getIdToken();

      const response = await fetchPayments("/create-module-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ moduleId }),
      });

      const raw = await response.text();
      let data = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        data = null;
      }
  
      if (!response.ok) {
        console.error("Create checkout session failed:", { status: response.status, data, raw });
        toast.error((data && data.message) || raw || "Unable to start checkout.");
        return;
      }
  
      setCheckoutStripeKey(String(data?.stripePublishableKey || fallbackStripeKey || "").trim() || null);
      setCheckoutClientSecret(data.clientSecret);
    } catch (err) {
      console.error("handleBuy error:", err);
      toast.error("Error starting checkout.");
    } finally {
      setIsStartingCheckout(false);
    }
  };
  



  return (
    <div style={{
      background: "#fff",
      minHeight: "100vh",
      padding: 0
    }}>
      <style>
        {`
        .resource-card:hover {
          box-shadow: 0 4px 16px rgba(0,0,0,0.12) !important;
          transform: translateY(-2px) !important;
        }
        .resource-card {
          box-shadow: none !important;
          transform: translateY(0) !important;
        }
        `}
      </style>

      {/* Back + Edit controls */}
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "18px 20px 0 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <BackButton to={returnTo || undefined} fallbackTo="/" />

        {canEdit && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <EditButton
              label="Edit Module"
              onClick={() =>
                navigate("/module-builder", {
                  state: {
                    editModuleId: moduleId,
                    returnTo: `${location.pathname}${location.search || ""}`,
                    moduleReturnTo: returnTo || null,
                  },
                })
              }
            />

            <DeleteButton onClick={() => setIsDeleteModalOpen(true)} />
          </div>
        )}
      </div>

      {canEdit && isDeleteModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.45)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !isDeleting) setIsDeleteModalOpen(false);
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 520,
              background: "#fff",
              borderRadius: 16,
              padding: "24px 22px",
              boxShadow: "0 18px 60px rgba(0,0,0,0.2)",
              border: "1px solid #e5e7eb",
            }}
          >
            <div style={{ fontSize: "1.2rem", fontWeight: 900, color: "#111" }}>
              Are you sure you want to delete the module?
            </div>
            <div style={{ marginTop: 10, color: "#444", lineHeight: 1.5 }}>
              This action cannot be undone.
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setIsDeleteModalOpen(false)}
                style={{
                  background: "#fff",
                  color: "#111",
                  border: "1px solid #e5e7eb",
                  borderRadius: 10,
                  padding: "10px 14px",
                  cursor: isDeleting ? "not-allowed" : "pointer",
                  fontWeight: 800,
                  opacity: isDeleting ? 0.6 : 1,
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteModule}
                style={{
                  background: "#b91c1c",
                  color: "#fff",
                  border: "2px solid #b91c1c",
                  borderRadius: 10,
                  padding: "10px 14px",
                  cursor: isDeleting ? "not-allowed" : "pointer",
                  fontWeight: 900,
                  opacity: isDeleting ? 0.7 : 1,
                }}
              >
                {isDeleting ? "Deleting..." : "OK"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header (match screenshot) */}
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "10px 20px 0 20px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            ...TYPO.pageTitle,
            fontWeight: 700,
            marginTop: 8,
            marginBottom: 10,
            letterSpacing: TYPO.pageTitle.letterSpacing,
          }}
        >
          {module.title}
        </div>
        <div style={{ maxWidth: 820, margin: "0 auto", textAlign: "left" }}>
          <div
            ref={descRef}
            style={{
              ...TYPO.pageSubtitle,
              color: "#222",
              ...(isDescExpanded
                ? {}
                : {
                    overflow: "hidden",
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                  }),
            }}
          >
            {module.subtitle?.replace(/<[^>]*>/g, "") || "No description available"}
          </div>
          {!isDescExpanded && showDescMore && (
            <button
              type="button"
              onClick={() => setIsDescExpanded(true)}
              style={{
                marginTop: 6,
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                color: "#162040",
                fontWeight: 800,
              }}
            >
              Show More
            </button>
          )}
        </div>

        {/* Metadata chips row */}
        {(() => {
          const category = getDetailValue(module.details, "Category") || "—";
          const level = getDetailValue(module.details, "Level") || "—";
          const type = getDetailValue(module.details, "Type") || "—";
          const duration = formatDurationShort(getDetailValue(module.details, "Duration"));

          return (
            <MetaChipsRow
              style={{ marginTop: 18 }}
              items={[
                { label: "Category", value: category },
                { label: "Level", value: level },
                { label: "Type", value: type },
                { label: "Duration", value: duration },
              ]}
            />
          );
        })()}

        {/* Featured purchase block (only when Featured is on) */}
        {moduleData?._meta?.isFeatured === true && (
          <div
            style={{
              maxWidth: 820,
              margin: "16px auto 0 auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 14,
              padding: "14px 16px",
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              background: "#f8fafc",
            }}
          >
            {(() => {
              const priceNum = Number(moduleData?._meta?.price);
              const hasPrice = Number.isFinite(priceNum) && priceNum > 0;
              const priceLabel = hasPrice ? `$${priceNum.toFixed(2)}` : "Free";

              return (
                <>
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontWeight: 900, color: "#111" }}>Price</div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 4 }}>
                      <div style={{ color: "#111", fontWeight: 900, fontSize: "2rem", lineHeight: 1 }}>
                        {priceLabel}
                      </div>
                      {hasPrice && (
                        <div style={{ color: "#6b7280", fontWeight: 800, fontSize: "0.95rem" }}>
                          one-time
                        </div>
                      )}
                    </div>
                    {hasPrice && (
                      <div style={{ marginTop: 8, color: "#6b7280", fontWeight: 700, fontSize: "0.95rem" }}>
                        Secure checkout
                      </div>
                    )}
                  </div>

                  {hasPrice && (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                      <button
                        type="button"
                        onClick={handleBuy}
                        disabled={isStartingCheckout || Boolean(checkoutClientSecret)}
                        style={{
                          background: "#162040",
                          color: "#fff",
                          border: "2px solid #162040",
                          borderRadius: 10,
                          padding: "10px 16px",
                          cursor: isStartingCheckout || checkoutClientSecret ? "not-allowed" : "pointer",
                          fontWeight: 900,
                          whiteSpace: "nowrap",
                          opacity: isStartingCheckout || checkoutClientSecret ? 0.7 : 1,
                        }}
                      >
                        {isStartingCheckout ? "Starting checkout..." : `Buy for ${priceLabel}`}
                      </button>
                      <div style={{ color: "#6b7280", fontWeight: 700, fontSize: "0.95rem" }}>
                        Instant access
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </div>


      {/* Main content cards */}
      <div style={{ maxWidth: 1100, margin: "28px auto 0 auto", padding: "0 20px" }}>
        {(() => {
          const cardStyle = {
            border: "1px solid #e5e7eb",
            borderRadius: 14,
            padding: "22px 24px",
            background: "#fff",
            marginTop: 22,
          };

          const cardTitleStyle = {
            ...TYPO.sectionTitle,
            color: "#222",
            marginBottom: 10,
          };

          const bodyStyle = { ...TYPO.body };

          const objectivesBullets = extractBulletsFromObjectives(module.learningObjectives);

          return (
            <>
              {/* What you will learn */}
              <div style={cardStyle}>
                <div style={cardTitleStyle}>What you will learn</div>
                {objectivesBullets === null ? (
                  <div
                    style={bodyStyle}
                    className="rich-text-content"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(module.learningObjectives || "") }}
                  />
                ) : (
                  <ul style={{ margin: 0, padding: 0, listStyle: "none", ...bodyStyle }}>
                    {(objectivesBullets || []).map((b, i) => (
                      <li key={i} style={{ display: "flex", gap: 10, marginTop: i === 0 ? 0 : 10 }}>
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            marginTop: 9,
                            borderRadius: 999,
                            background: "#1d4ed8",
                            flex: "0 0 8px",
                          }}
                        />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Requirements */}
              <div style={cardStyle}>
                <div style={cardTitleStyle}>Requirements</div>
                <div
                  style={bodyStyle}
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(module.requirements || "No specific requirements."),
                  }}
                />
              </div>

            </>
          );
        })()}
      </div>

      {/* Lesson plans section (match screenshot) */}
      <div style={{ maxWidth: 1100, margin: "26px auto 0 auto", padding: "0 20px 80px 20px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <div style={{ ...TYPO.sectionTitle, color: "#222" }}>
            Lesson plans ({module.resources?.length || 0})
          </div>
          <div style={{ ...TYPO.meta, color: "#666" }}>
            Pick a lesson to view details and materials.
          </div>
        </div>

        {moduleLocked && (
          <div
            style={{
              marginTop: 16,
              padding: "24px",
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              background: "#F9FAFB",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "1.6rem", marginBottom: 8 }}>🔒</div>
            <div style={{ ...TYPO.body, fontWeight: 800, color: "#222", marginBottom: 6 }}>
              Purchase this module to view its lessons
            </div>
            <div style={{ ...TYPO.meta, color: "#666" }}>
              The lessons in this module are available after purchase.
            </div>
          </div>
        )}

        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          {(module.resources || []).map((res, idx) => {
            const durationText = normalizeLessonDuration(res.duration);
            const subtitle = `${res.type || "Lesson"}${durationText ? ` • ${durationText}` : ""}`;

            return (
              <div
                key={res.id || idx}
                role="button"
                tabIndex={0}
                onClick={() => handleLessonClick(res, idx)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleLessonClick(res, idx);
                  }
                }}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 14,
                  padding: "14px 16px",
                  background: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                  cursor: "pointer",
                  transition: "transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.08)";
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.borderColor = "#cbd5e1";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.borderColor = "#e5e7eb";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      border: "1px solid #d1d5db",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      color: "#111",
                      background: "#f9fafb",
                      flex: "0 0 34px",
                    }}
                  >
                    {idx + 1}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ ...TYPO.body, fontWeight: 800, color: "#222", lineHeight: 1.2 }}>
                      {`Lesson ${idx + 1}. ${res.title || "Untitled Lesson"}`}
                    </div>
                    <div style={{ ...TYPO.meta, color: "#666", marginTop: 4 }}>{subtitle}</div>
                  </div>
                </div>
                <div style={{ width: 12 }} />
              </div>
            );
          })}
        </div>
      </div>

      {checkoutClientSecret && (
        <Modal
          open={true}
          onClose={() => {
            setCheckoutClientSecret(null);
            setCheckoutStripeKey(null);
            checkoutInitRef.current = null;
          }}
          style={{
            content: {
              inset: "5%",
              padding: 0,
              borderRadius: 12,
            },
            overlay: {
              backgroundColor: "rgba(0,0,0,0.6)",
              zIndex: 10000,
            },
          }}
        >
          <div id="checkout-container" style={{ height: "100%" }} />
        </Modal>
      )}

      {showPurchaseSuccess && (
        <Modal
          open={true}
          onClose={() => setShowPurchaseSuccess(false)}
          style={{
            content: {
              top: "50%",
              left: "50%",
              right: "auto",
              bottom: "auto",
              transform: "translate(-50%, -50%)",
              width: "95vw",
              maxWidth: 520,
              padding: "26px 22px",
              borderRadius: 16,
              border: "1px solid #e5e7eb",
            },
            overlay: {
              backgroundColor: "rgba(0,0,0,0.55)",
              zIndex: 11000,
            },
          }}
          title="Purchase successful"
        >
          <div style={{ fontSize: "1.35rem", fontWeight: 900, color: "#111" }}>
            Purchase successful
          </div>
          <div style={{ marginTop: 12, color: "#333", fontSize: "1.05rem", lineHeight: 1.5 }}>
            You should be able to access the module.
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
            <button
              type="button"
              onClick={() => {
                setShowPurchaseSuccess(false);
                navigate("/", { replace: true });
              }}
              style={{
                background: "#162040",
                color: "#fff",
                border: "2px solid #162040",
                borderRadius: 10,
                padding: "10px 16px",
                cursor: "pointer",
                fontWeight: 900,
              }}
            >
              OK
            </button>
          </div>
        </Modal>
      )}

    </div>
  );
};

export default ModuleDetail;