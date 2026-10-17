"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import styles from "../admin.module.css";
import { Icon } from "./AdminUI";

export type SellerOption = { id: string; display_name: string | null; email?: string | null };

function sellerLabel(seller: SellerOption) {
  return seller.display_name || seller.email || `Seller ${seller.id.slice(0, 8)}`;
}

/** Searchable single-select for choosing a seller by name or email. */
export function SellerPicker({
  sellers,
  value,
  onChange,
  disabled,
  labelledBy,
}: {
  sellers: SellerOption[];
  value: string;
  onChange: (sellerId: string) => void;
  disabled?: boolean;
  labelledBy?: string;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const selected = sellers.find((seller) => seller.id === value) ?? null;

  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return sellers;
    return sellers.filter((seller) =>
      `${seller.display_name ?? ""} ${seller.email ?? ""}`.toLowerCase().includes(term),
    );
  }, [query, sellers]);

  useEffect(() => {
    const closeWhenOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeWhenOutside);
    return () => document.removeEventListener("pointerdown", closeWhenOutside);
  }, []);

  function openList() {
    setQuery("");
    setActiveIndex(0);
    setOpen(true);
  }

  function choose(seller: SellerOption) {
    onChange(seller.id);
    setQuery("");
    setOpen(false);
  }

  return (
    <div className={styles.sellerPicker} ref={rootRef}>
      <div className={styles.sellerPickerInput}>
        <Icon name="search" size={16} />
        <input
          aria-activedescendant={open && matches[activeIndex] ? `${listId}-${matches[activeIndex].id}` : undefined}
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={open}
          aria-labelledby={labelledBy}
          autoComplete="off"
          disabled={disabled}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
            setOpen(true);
          }}
          onFocus={openList}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              if (!open) openList();
              else setActiveIndex((index) => Math.min(index + 1, Math.max(matches.length - 1, 0)));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex((index) => Math.max(index - 1, 0));
            } else if (event.key === "Enter" && open) {
              // Stop Enter from submitting the shop form while picking.
              event.preventDefault();
              if (matches[activeIndex]) choose(matches[activeIndex]);
            } else if (event.key === "Escape" && open) {
              event.stopPropagation();
              setOpen(false);
            }
          }}
          placeholder={selected ? sellerLabel(selected) : "Search sellers by name or email"}
          role="combobox"
          value={open ? query : selected ? sellerLabel(selected) : ""}
        />
        {selected && !disabled ? (
          <button
            aria-label="Clear selected seller"
            className={styles.sellerPickerClear}
            onClick={() => {
              onChange("");
              openList();
            }}
            type="button"
          >
            <Icon name="close" size={14} />
          </button>
        ) : null}
      </div>
      {selected && !open && selected.email && selected.email !== sellerLabel(selected) ? (
        <small className={styles.sellerPickerMeta}>{selected.email}</small>
      ) : null}
      {open ? (
        <ul className={styles.sellerPickerList} id={listId} role="listbox">
          {matches.length ? matches.map((seller, index) => (
            <li
              aria-selected={seller.id === value}
              className={`${styles.sellerPickerOption} ${index === activeIndex ? styles.sellerPickerOptionActive : ""}`}
              id={`${listId}-${seller.id}`}
              key={seller.id}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(seller)}
              onMouseEnter={() => setActiveIndex(index)}
              role="option"
            >
              <strong>{sellerLabel(seller)}</strong>
              {seller.email && seller.email !== sellerLabel(seller) ? <small>{seller.email}</small> : null}
              {seller.id === value ? <Icon name="check" size={15} /> : null}
            </li>
          )) : <li className={styles.sellerPickerEmpty}>No sellers match “{query.trim()}”.</li>}
        </ul>
      ) : null}
    </div>
  );
}
