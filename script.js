document.documentElement.classList.add("js");

const emailButton = document.querySelector("[data-copy-email]");
const emailTooltip = document.getElementById("email-tooltip");
const emailCopyStatus = document.getElementById("email-copy-status");
const bibtexCopyStatus = document.getElementById("bibtex-copy-status");
const introNavToggle = document.querySelector(".intro-icon");
const introNav = introNavToggle?.closest(".intro-nav-sticky");
const introReturnTop = introNav?.querySelector(".intro-return-top");
const singleColumnLayout = window.matchMedia("(max-width: 720px)");
let emailTooltipTimer;

if (introNavToggle && introNav) {
  const setIntroNavLocked = (isOpen) => {
    introNav.classList.toggle("is-open", isOpen);
    introNavToggle.setAttribute("aria-expanded", String(isOpen));
  };

  introNavToggle.addEventListener("click", () => {
    const shouldOpen = !introNav.classList.contains("is-open");

    setIntroNavLocked(shouldOpen);
    introNav.classList.toggle("is-hover-suppressed", !shouldOpen);
  });

  introNav.addEventListener("pointerleave", () => {
    introNav.classList.remove("is-hover-suppressed");
  });

  introNav.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !introNav.classList.contains("is-open")) {
      return;
    }

    event.preventDefault();
    setIntroNavLocked(false);
    introNav.classList.add("is-hover-suppressed");
    introNavToggle.focus();
  });

  introNav
    .querySelectorAll('.intro-section-links a[href^="#"]')
    .forEach((link) => {
      link.addEventListener("click", (event) => {
        const targetId = link.getAttribute("href")?.slice(1);
        const target = targetId ? document.getElementById(targetId) : null;

        if (!target) {
          return;
        }

        event.preventDefault();

        const prefersReducedMotion = window.matchMedia(
          "(prefers-reduced-motion: reduce)"
        ).matches;

        target.scrollIntoView({
          behavior: prefersReducedMotion ? "auto" : "smooth",
          block: "start",
          inline: "nearest",
        });
      });
    });

  if (introReturnTop) {
    let returnTopUpdateFrame;
    let isReturnTopAvailable = false;

    const updateReturnTopAvailability = () => {
      returnTopUpdateFrame = undefined;

      const scrollableDistance = Math.max(
        0,
        document.documentElement.scrollHeight - window.innerHeight
      );
      const scrollProgress =
        scrollableDistance > 0 ? window.scrollY / scrollableDistance : 0;
      const shouldShow =
        !singleColumnLayout.matches && scrollProgress >= 0.1;

      if (shouldShow === isReturnTopAvailable) {
        return;
      }

      isReturnTopAvailable = shouldShow;
      introNav.classList.toggle("has-return-top", shouldShow);
      introReturnTop.tabIndex = shouldShow ? 0 : -1;

      if (shouldShow) {
        introReturnTop.removeAttribute("aria-hidden");
      } else {
        introReturnTop.setAttribute("aria-hidden", "true");

        if (document.activeElement === introReturnTop) {
          introNavToggle.focus({ preventScroll: true });
        }
      }
    };

    const queueReturnTopUpdate = () => {
      if (returnTopUpdateFrame !== undefined) {
        return;
      }

      returnTopUpdateFrame = requestAnimationFrame(
        updateReturnTopAvailability
      );
    };

    window.addEventListener("scroll", queueReturnTopUpdate, {
      passive: true,
    });
    window.addEventListener("resize", queueReturnTopUpdate);

    if ("ResizeObserver" in window) {
      new ResizeObserver(queueReturnTopUpdate).observe(
        document.documentElement
      );
    }

    introReturnTop.addEventListener("click", () => {
      if (singleColumnLayout.matches) {
        return;
      }

      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      document.getElementById("main-content")?.focus({
        preventScroll: true,
      });
      window.scrollTo({
        top: 0,
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });
    });

    updateReturnTopAvailability();
  }
}

async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const activeElement =
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
  const selection = window.getSelection();
  const savedRanges = selection
    ? Array.from({ length: selection.rangeCount }, (_, index) =>
        selection.getRangeAt(index).cloneRange()
      )
    : [];
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.className = "clipboard-fallback";
  document.body.append(textarea);
  let copied = false;

  try {
    textarea.select();
    copied = document.execCommand("copy");
  } finally {
    textarea.remove();
    activeElement?.focus({ preventScroll: true });

    if (selection) {
      selection.removeAllRanges();
      savedRanges.forEach((range) => selection.addRange(range));
    }
  }

  if (!copied) {
    throw new Error("Clipboard copy failed");
  }
}

function announce(region, message) {
  if (!region) {
    return;
  }

  region.textContent = "";
  requestAnimationFrame(() => {
    region.textContent = message;
  });
}

if (emailButton && emailTooltip && emailCopyStatus) {
  emailButton.addEventListener("click", async () => {
    const selection = window.getSelection();

    if (
      selection &&
      !selection.isCollapsed &&
      emailButton.contains(selection.anchorNode) &&
      emailButton.contains(selection.focusNode)
    ) {
      return;
    }

    clearTimeout(emailTooltipTimer);

    try {
      await copyText(emailButton.dataset.copyEmail);
      emailTooltip.classList.add("is-copied");
      announce(emailCopyStatus, "Email copied");
    } catch {
      emailTooltip.classList.remove("is-copied");
      announce(emailCopyStatus, "Could not copy email");
    }

    emailTooltipTimer = setTimeout(() => {
      emailTooltip.classList.remove("is-copied");
      emailCopyStatus.textContent = "";
    }, 1800);
  });
}

const tooltipControls = [
  ...document.querySelectorAll(".sidebar-link[aria-describedby]"),
];

tooltipControls.forEach((control) => {
  const tooltip = document.getElementById(
    control.getAttribute("aria-describedby")
  );

  if (!tooltip) {
    return;
  }

  const resetDismissalIfInactive = () => {
    requestAnimationFrame(() => {
      if (
        !control.matches(":hover") &&
        !tooltip.matches(":hover") &&
        document.activeElement !== control
      ) {
        tooltip.classList.remove("is-dismissed");
      }
    });
  };

  control.addEventListener("pointerleave", resetDismissalIfInactive);
  control.addEventListener("blur", resetDismissalIfInactive);
  tooltip.addEventListener("pointerleave", resetDismissalIfInactive);
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") {
    return;
  }

  let dismissedTooltip = false;

  tooltipControls.forEach((control) => {
      const tooltip = document.getElementById(
        control.getAttribute("aria-describedby")
      );

      if (!tooltip) {
        return;
      }

      if (
        !control.matches(":hover") &&
        !tooltip.matches(":hover") &&
        document.activeElement !== control
      ) {
        return;
      }

      tooltip.classList.add("is-dismissed");
      dismissedTooltip = true;
    });

  if (dismissedTooltip) {
    event.preventDefault();
  }
});

const courseTermToggles = [
  ...document.querySelectorAll(".course-term-toggle"),
];

function setCourseTerm(toggle, isOpen, isDismissed = false) {
  const term = toggle.closest(".course-term");
  const label = document.getElementById(
    toggle.getAttribute("aria-controls")
  );

  if (!term || !label) {
    return;
  }

  toggle.setAttribute("aria-expanded", String(isOpen));
  label.setAttribute("aria-hidden", String(!isOpen));
  term.classList.toggle("is-open", isOpen);
  term.classList.toggle("is-dismissed", isDismissed && !isOpen);
}

courseTermToggles.forEach((toggle) => {
  setCourseTerm(toggle, false);

  toggle.addEventListener("click", () => {
    const shouldOpen = toggle.getAttribute("aria-expanded") !== "true";

    courseTermToggles.forEach((otherToggle) => {
      setCourseTerm(otherToggle, false);
    });

    setCourseTerm(toggle, shouldOpen, !shouldOpen);
  });

  const term = toggle.closest(".course-term");

  if (!term) {
    return;
  }

  const label = document.getElementById(
    toggle.getAttribute("aria-controls")
  );

  label?.addEventListener("click", () => {
    toggle.click();
  });

  const resetDismissalIfInactive = () => {
    requestAnimationFrame(() => {
      if (
        !term.matches(":hover") &&
        !term.contains(document.activeElement)
      ) {
        term.classList.remove("is-dismissed");
      }
    });
  };

  term.addEventListener("pointerenter", () => {
    term.classList.remove("is-dismissed");
  });
  term.addEventListener("pointerleave", resetDismissalIfInactive);
  toggle.addEventListener("blur", resetDismissalIfInactive);
});

document.addEventListener("click", (event) => {
  if (
    event.target instanceof Element &&
    event.target.closest(".course-term")
  ) {
    return;
  }

  courseTermToggles.forEach((toggle) => {
    setCourseTerm(toggle, false);
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") {
    return;
  }

  let dismissedCourseTerm = false;

  courseTermToggles.forEach((toggle) => {
    const term = toggle.closest(".course-term");

    if (
      !term ||
      (
        toggle.getAttribute("aria-expanded") !== "true" &&
        !term.matches(":hover") &&
        !term.contains(document.activeElement)
      )
    ) {
      return;
    }

    setCourseTerm(toggle, false, true);
    dismissedCourseTerm = true;
  });

  if (dismissedCourseTerm) {
    event.preventDefault();
  }
});

const publicationToggles = [
  ...document.querySelectorAll(
    ".abstract-toggle, .bibtex-toggle"
  ),
];

function setDisclosure(toggle, isOpen) {
  const panel = document.getElementById(toggle.getAttribute("aria-controls"));

  if (!panel) {
    return;
  }

  toggle.setAttribute("aria-expanded", String(isOpen));
  panel.setAttribute("aria-hidden", String(!isOpen));
  panel.toggleAttribute("inert", !isOpen);
  panel.classList.toggle("is-open", isOpen);
}

publicationToggles.forEach((toggle) => {
  setDisclosure(toggle, false);
});

publicationToggles.forEach((toggle) => {
  toggle.addEventListener("click", () => {
    const shouldOpen = toggle.getAttribute("aria-expanded") !== "true";

    publicationToggles.forEach((otherToggle) => {
      setDisclosure(otherToggle, false);
    });

    if (shouldOpen) {
      setDisclosure(toggle, true);
      scrollDisclosureIntoView(toggle);
    }
  });
});

let disclosureScrollTimer;
let autoScrollUnlockTimer;
let activeAutoScrollUnlock;

function lockPointerLinksDuringAutoScroll() {
  if (activeAutoScrollUnlock) {
    document.removeEventListener("scrollend", activeAutoScrollUnlock);
  }

  clearTimeout(autoScrollUnlockTimer);
  document.documentElement.classList.add("is-auto-scrolling");

  const unlock = () => {
    document.removeEventListener("scrollend", unlock);

    if (activeAutoScrollUnlock !== unlock) {
      return;
    }

    document.documentElement.classList.remove("is-auto-scrolling");
    clearTimeout(autoScrollUnlockTimer);
    activeAutoScrollUnlock = null;
  };

  activeAutoScrollUnlock = unlock;
  document.addEventListener("scrollend", unlock, { once: true });
  autoScrollUnlockTimer = setTimeout(unlock, 1000);
}

function scrollDisclosureIntoView(toggle) {
  const panel = document.getElementById(toggle.getAttribute("aria-controls"));

  if (!panel) {
    return;
  }

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  clearTimeout(disclosureScrollTimer);
  disclosureScrollTimer = setTimeout(() => {
    if (toggle.getAttribute("aria-expanded") !== "true") {
      return;
    }

    const panelRect = panel.getBoundingClientRect();
    const viewportHeight =
      window.innerHeight || document.documentElement.clientHeight;
    const upperThreshold = viewportHeight * 0.15;
    const lowerThreshold = viewportHeight * 0.85;
    let scrollOffset = 0;

    if (panelRect.top < upperThreshold) {
      scrollOffset = panelRect.top - upperThreshold;
    } else if (panelRect.bottom > lowerThreshold) {
      scrollOffset = panelRect.bottom - lowerThreshold;
    }

    if (Math.abs(scrollOffset) <= 1) {
      return;
    }

    if (!prefersReducedMotion) {
      lockPointerLinksDuringAutoScroll();
    }

    window.scrollBy({
      top: scrollOffset,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  }, prefersReducedMotion ? 0 : 310);
}

document.querySelectorAll("[data-copy-bibtex]").forEach((button) => {
  const code = button.parentElement.querySelector("code");
  const copyIcon = button.querySelector(".bibtex-copy-icon");
  const bibtexText = code?.textContent ?? "";
  let resetTimer;

  if (copyIcon && !copyIcon.querySelector(".fa-solid.fa-copy")) {
    const solidCopyIcon = document.createElement("i");
    solidCopyIcon.className = "fa-solid fa-copy";
    copyIcon.append(solidCopyIcon);
  }

  if (!code) {
    return;
  }

  const accessibleCode = document.createElement("span");
  const visualCode = document.createElement("span");
  accessibleCode.className = "visually-hidden";
  accessibleCode.textContent = bibtexText;
  visualCode.className = "bibtex-lines";
  visualCode.setAttribute("aria-hidden", "true");

  bibtexText.split("\n").forEach((line) => {
    const lineElement = document.createElement("span");
    const fieldPrefix = line.match(/^\s*[^=]+?=\s*[{"]?/u)?.[0];
    const hangingIndent = fieldPrefix
      ? Array.from(fieldPrefix).length
      : 2;
    lineElement.className = "bibtex-line";
    lineElement.style.setProperty(
      "--bibtex-hanging-indent",
      `${hangingIndent}ch`
    );
    lineElement.style.setProperty(
      "--bibtex-first-line-offset",
      `-${hangingIndent}ch`
    );
    lineElement.textContent = line || " ";
    visualCode.append(lineElement);
  });

  code.replaceChildren(accessibleCode, visualCode);

  button.addEventListener("click", async () => {
    clearTimeout(resetTimer);

    try {
      await copyText(bibtexText);
      button.classList.add("is-copied");
      button.setAttribute("aria-label", "BibTeX copied");
      announce(bibtexCopyStatus, "BibTeX copied");
    } catch {
      button.classList.remove("is-copied");
      button.setAttribute("aria-label", "Could not copy BibTeX citation");
      announce(bibtexCopyStatus, "Could not copy BibTeX citation");
    }

    resetTimer = setTimeout(() => {
      button.classList.remove("is-copied");
      button.setAttribute("aria-label", "Copy BibTeX citation");
      if (bibtexCopyStatus) {
        bibtexCopyStatus.textContent = "";
      }
    }, 1800);
  });
});
