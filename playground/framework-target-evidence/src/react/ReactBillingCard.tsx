import React from 'react'
import { ReactUpgradeButton } from './ReactUpgradeButton'

export function ReactBillingCard({ workspaceId }: { workspaceId: string }) {
  void workspaceId
  return (
    <article className="framework-card react-card" aria-labelledby="react-billing-heading">
      <div>
        <span className="eyebrow">React runtime</span>
        <h2 id="react-billing-heading">React billing component</h2>
        <p>
          Click the button to validate React fiber owner-chain and local source evidence without
          enabling any Inspecto compile-time plugin.
        </p>
      </div>
      <ReactUpgradeButton planId="react-enterprise-secret-plan" onUpgrade={() => undefined} />
    </article>
  )
}
