"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import labels, { t } from "@/lib/i18n/labels";
import type { Lang } from "@/lib/types";
import { getGroupLabel, getTitle } from "@/lib/types";
import { Dropdown, type DropdownOption } from "@/components/ui/Dropdown";

interface Props {
  variant?: "compact" | "full";
}

export function ModuleSelector({ variant = "compact" }: Props) {
  const { lang, selectedModuleId, setModule, modules } = useStore();

  const options: DropdownOption[] = useMemo(() => {
    return modules.map((mod) => ({
      value: mod.id,
      label: getTitle(mod, lang),
      sublabel: mod.id,
      group:
        mod.group_key === "compulsory"
          ? t("compulsory", lang)
          : mod.group_key === "elective"
          ? t("elective", lang)
          : getGroupLabel(mod, lang),
    }));
  }, [modules, lang]);

  // Fallback option so the trigger has a label before modules load
  const effective: DropdownOption[] = options.length > 0
    ? options
    : [{ value: selectedModuleId, label: t("selectModule", lang) }];

  return (
    <Dropdown
      options={effective}
      value={selectedModuleId}
      onChange={setModule}
      ariaLabel={t("selectModule", lang)}
      placeholder={t("selectModule", lang)}
      fullWidth={variant === "full"}
      // Responsive cap: longer titles get more room on wider screens.
      className={
        variant === "compact"
          ? "max-w-[200px] xl:max-w-[280px] 2xl:max-w-[360px]"
          : ""
      }
      size={variant === "compact" ? "sm" : "md"}
    />
  );
}

export function LangSelector({ variant = "compact" }: Props) {
  const { lang, setLang } = useStore();

  const options: DropdownOption[] = [
    { value: "bn", label: labels.langNames.bn, sublabel: labels.langNames.bn },
    { value: "hi", label: labels.langNames.hi, sublabel: labels.langNames.hi },
    { value: "en", label: labels.langNames.en, sublabel: "English" },
  ];

  return (
    <Dropdown
      options={options}
      value={lang}
      onChange={(v) => setLang(v as Lang)}
      ariaLabel={t("language", lang)}
      fullWidth={variant === "full"}
      size={variant === "compact" ? "sm" : "md"}
    />
  );
}
