import React from 'react'

export function ReactUpgradeButton({
  planId,
  onUpgrade,
}: {
  planId: string
  onUpgrade: () => void
}) {
  void planId
  return (
    <button
      id="react-upgrade-plan"
      className="primary-button react-upgrade-button billing-upgrade-cta"
      data-testid="react-upgrade-plan"
      aria-label="Upgrade React enterprise plan"
      onClick={onUpgrade}
    >
      Upgrade React plan
    </button>
  )
}
