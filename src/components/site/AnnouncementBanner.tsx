import { AlertTriangle, X } from "lucide-react";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import dictionary from "@/Constants/dictionary";

// Flip `enabled` to false to pull the banner site-wide without touching layout code.
// `persist: "session"` re-shows it every new browser session; "forever" dismisses permanently.
const announcement = {
  enabled: true,
  message: dictionary.globalBanner,
  persist: "forever" as "session" | "forever",
};

const DISMISS_KEY = "announcement-dismissed";

type AnnouncementBannerProps = {
  widthClassName?: string;
};

const AnnouncementBanner = ({ widthClassName = "max-w-2xl" }: AnnouncementBannerProps) => {
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (!announcement.enabled) return;

    const store = announcement.persist === "session" ? sessionStorage : localStorage;
    setHidden(store.getItem(DISMISS_KEY) === "true");
  }, []);

  const handleClose = () => {
    const store = announcement.persist === "session" ? sessionStorage : localStorage;

    store.setItem(DISMISS_KEY, "true");
    setHidden(true);
  };

  if (!announcement.enabled) return null;

  return (
    <AnimatePresence>
      {!hidden && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className={`mx-auto w-full ${widthClassName}`}
        >
          <div
            className="
              relative
              flex
              min-h-12
              items-center
              gap-3
              rounded-xl
              border
              border-black/10
              bg-white/75
              px-4
              py-2.5
              shadow-[0_6px_25px_rgba(0,0,0,0.12)]
              backdrop-blur-md
              backdrop-saturate-150
              dark:border-white/15
              dark:bg-[#17130f]/75
              dark:shadow-[0_6px_25px_rgba(0,0,0,0.35)]
              sm:min-h-14
              sm:px-4
            "
          >
            {/* Icon */}
            <div
              className="
                flex
                size-8
                shrink-0
                items-center
                justify-center
                rounded-full
                bg-gold/15
                text-gold
                sm:size-9
              "
            >
              <AlertTriangle
                className="size-4 sm:size-[18px]"
                strokeWidth={1.6}
              />
            </div>

            {/* Message */}
            <p
              className="
                min-w-0
                flex-1
                pr-7
                text-xs
                font-medium
                leading-relaxed
                text-neutral-800
                dark:text-white/90
                sm:text-sm
              "
            >
              {announcement.message}
            </p>

            {/* Close */}
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close announcement"
              className="
                absolute
                right-2.5
                top-1/2
                flex
                size-7
                -translate-y-1/2
                items-center
                justify-center
                rounded-full
                text-neutral-500
                transition-colors
                hover:bg-black/5
                hover:text-neutral-900
                dark:text-white/50
                dark:hover:bg-white/10
                dark:hover:text-white
              "
            >
              <X className="size-4" strokeWidth={1.7} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AnnouncementBanner;