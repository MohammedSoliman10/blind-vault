"use client";

import React from "react";
import { cx } from "./ui/cx";

/**
 * Connect Wallet button, from Uiverse.io by andrei0x309.
 * Markup is the original; the `.button.x` selector became `.connect-wallet` in globals.css
 * so it does not collide with other button classes.
 */
export function ConnectWalletButton({
  onClick,
  className,
}: {
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button type="button" onClick={onClick} className={cx("connect-wallet", className)}>
      <svg xmlns="http://www.w3.org/2000/svg" width="48" viewBox="0 0 48 48" height="48" aria-hidden="true">
        <path fill="none" d="M0 0h48v48H0z"></path>
        <path d="M42 36v2c0 2.21-1.79 4-4 4H10c-2.21 0-4-1.79-4-4V10c0-2.21 1.79-4 4-4h28c2.21 0 4 1.79 4 4v2H24c-2.21 0-4 1.79-4 4v16c0 2.21 1.79 4 4 4h18zm-18-4h20V16H24v16zm8-5c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"></path>
      </svg>
      Connect Wallet
    </button>
  );
}

export default ConnectWalletButton;
