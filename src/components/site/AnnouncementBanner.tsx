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
    <div className="w-full px-4 pt-6 sm:px-6 lg:px-8">
      <AnimatePresence>
        {!hidden && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35 }}
            className={`mx-auto w-full ${widthClassName}`}
          >
            <div
              className="
                relative
                flex
                w-full
                items-center
                gap-3
                rounded-[22px]
                border
                border-white/20
                bg-white/[0.14]
                px-4
                py-3
                shadow-[0_8px_40px_rgba(0,0,0,0.22)]
                backdrop-blur-xl
                backdrop-saturate-150
                sm:gap-4
                sm:px-5
                sm:py-4
              "
            >
              {/* Icon */}
              <div
                className="
                  flex
                  size-10
                  shrink-0
                  items-center
                  justify-center
                  rounded-full
                  bg-[#d8b36a]/15
                  text-[#d8b36a]
                  sm:size-11
                "
              >
                <AlertTriangle className="size-5 sm:size-[21px]" strokeWidth={1.5} />
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1 pr-7">
                <p className="text-xs leading-relaxed text-white/85 sm:text-sm sm:leading-relaxed">
                  {announcement.message}
                </p>
              </div>

              {/* Close */}
              <button
                type="button"
                onClick={handleClose}
                aria-label="Close announcement"
                className="
                  absolute
                  right-3
                  top-1/2
                  flex
                  size-7
                  -translate-y-1/2
                  items-center
                  justify-center
                  rounded-full
                  text-white/50
                  transition-colors
                  hover:bg-white/10
                  hover:text-white
                  sm:right-4
                "
              >
                <X className="size-4" strokeWidth={1.5} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AnnouncementBanner;