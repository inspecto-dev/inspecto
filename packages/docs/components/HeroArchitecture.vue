<template>
  <div class="hero-arch-container">
    <div class="mode-tabs">
      <button 
        :class="{ active: activeMode === 'inspect' }"
        @click="activeMode = 'inspect'"
      >
        Inspect mode
      </button>
      <button 
        :class="{ active: activeMode === 'annotate' }"
        @click="activeMode = 'annotate'"
      >
        Annotate mode
      </button>
      <button 
        :class="{ active: activeMode === 'jump' }"
        @click="activeMode = 'jump'"
      >
        Quick jump
      </button>
    </div>

    <svg class="hero-arch-svg" viewBox="0 0 800 360" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="glowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#bd34fe" stop-opacity="0" />
          <stop offset="100%" stop-color="#41d1ff" stop-opacity="1" />
        </linearGradient>

        <linearGradient id="glowGradientEditor" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#a324db" stop-opacity="0" />
          <stop offset="100%" stop-color="#bd34fe" stop-opacity="1" />
        </linearGradient>

        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>

        <!-- Browser Icon -->
        <g id="icon-browser">
          <rect x="-30" y="-20" width="60" height="40" rx="4" fill="var(--vp-c-bg)" stroke="var(--vp-c-text-2)" stroke-width="2"/>
          <circle cx="-20" cy="-12" r="2" fill="var(--vp-c-text-3)" />
          <circle cx="-12" cy="-12" r="2" fill="var(--vp-c-text-3)" />
          <circle cx="-4" cy="-12" r="2" fill="var(--vp-c-text-3)" />
          <line x1="-30" y1="-4" x2="30" y2="-4" stroke="var(--vp-c-text-2)" stroke-width="1" />
          <rect x="-20" y="4" width="40" height="8" rx="2" fill="var(--vp-c-brand-1)" opacity="0.2" />
        </g>

        <!-- AI Assistant Icon -->
        <g id="icon-ai">
          <circle cx="0" cy="0" r="20" fill="var(--vp-c-bg)" stroke="var(--vp-c-text-2)" stroke-width="2" />
          <path d="M -8,0 L 0,-8 L 8,0 L 0,8 Z" fill="none" stroke="var(--vp-c-brand-1)" stroke-width="2" />
        </g>

        <!-- Editor Icon -->
        <g id="icon-editor">
          <rect x="-20" y="-24" width="40" height="48" rx="4" fill="var(--vp-c-bg)" stroke="var(--vp-c-text-2)" stroke-width="2"/>
          <line x1="-10" y1="-12" x2="10" y2="-12" stroke="var(--vp-c-text-3)" stroke-width="2" stroke-linecap="round" />
          <line x1="-10" y1="-4" x2="4" y2="-4" stroke="var(--vp-c-text-3)" stroke-width="2" stroke-linecap="round" />
          <line x1="-10" y1="4" x2="10" y2="4" stroke="var(--vp-c-text-3)" stroke-width="2" stroke-linecap="round" />
          <line x1="-10" y1="12" x2="0" y2="12" stroke="var(--vp-c-text-3)" stroke-width="2" stroke-linecap="round" />
        </g>
      </defs>

      <!-- Connection Tracks (Background paths) -->
      <!-- Browser to AI -->
      <path d="M 230,180 C 350,180 450,100 570,100" 
            class="arch-track"
            :style="{ opacity: activeMode === 'jump' ? 0.1 : 0.3 }" />
      
      <!-- Browser to Editor -->
      <path d="M 230,180 C 350,180 450,260 570,260" 
            class="arch-track"
            :style="{ opacity: 0.3 }" />

      <!-- Active Mode Animations -->
      
      <!-- Inspect Mode: Single request to AI + Editor -->
      <g v-if="activeMode === 'inspect'">
        <path d="M 230,180 C 350,180 450,100 570,100" stroke="url(#glowGradient)" class="arch-beam inspect-beam" />
        <path d="M 230,180 C 350,180 450,260 570,260" stroke="url(#glowGradientEditor)" class="arch-beam inspect-beam-delayed" />
        
        <g class="float-chip" style="animation-delay: 0s">
          <rect x="360" y="126" width="114" height="24" rx="12" fill="var(--vp-c-bg)" stroke="var(--vp-c-brand-2)" stroke-width="1.5" filter="url(#glow)"/>
          <text x="417" y="142" text-anchor="middle" fill="var(--vp-c-text-1)" font-size="11" font-weight="600" font-family="monospace">1 Component + AI</text>
        </g>

        <g class="float-chip" style="animation-delay: 0.5s">
          <rect x="330" y="246" width="90" height="24" rx="12" fill="var(--vp-c-bg)" stroke="var(--vp-c-brand-3)" stroke-width="1.5" filter="url(#glow)"/>
          <text x="375" y="262" text-anchor="middle" fill="var(--vp-c-text-1)" font-size="11" font-weight="600" font-family="monospace">Open Source</text>
        </g>
      </g>

      <!-- Annotate Mode: Batch notes to AI + Single Jump -->
      <g v-if="activeMode === 'annotate'">
        <path d="M 230,180 C 350,180 450,100 570,100" stroke="url(#glowGradient)" class="arch-beam inspect-beam" />
        <path d="M 230,180 C 350,180 450,260 570,260" stroke="url(#glowGradientEditor)" class="arch-beam inspect-beam-delayed" />
        
        <g class="float-chip" style="animation-delay: 0s">
          <rect x="345" y="126" width="134" height="24" rx="12" fill="var(--vp-c-bg)" stroke="var(--vp-c-brand-2)" stroke-width="1.5" filter="url(#glow)"/>
          <text x="412" y="142" text-anchor="middle" fill="var(--vp-c-text-1)" font-size="11" font-weight="600" font-family="monospace">Batch Notes + Goal</text>
        </g>

        <g class="float-chip" style="animation-delay: 1.5s">
          <rect x="330" y="246" width="90" height="24" rx="12" fill="var(--vp-c-bg)" stroke="var(--vp-c-brand-3)" stroke-width="1.5" filter="url(#glow)"/>
          <text x="375" y="262" text-anchor="middle" fill="var(--vp-c-text-1)" font-size="11" font-weight="600" font-family="monospace">Open Source</text>
        </g>

        <!-- Little annotation badges popping out -->
        <g class="pulse-dot" style="transform: translate(250px, 150px); animation-delay: 0s"><circle r="4" fill="var(--vp-c-brand-1)"/></g>
        <g class="pulse-dot" style="transform: translate(280px, 180px); animation-delay: 0.6s"><circle r="4" fill="var(--vp-c-brand-2)"/></g>
        <g class="pulse-dot" style="transform: translate(260px, 210px); animation-delay: 1.2s"><circle r="4" fill="var(--vp-c-brand-3)"/></g>
      </g>

      <!-- Quick Jump Mode: Fast direct to IDE -->
      <g v-if="activeMode === 'jump'">
        <path d="M 230,180 C 350,180 450,260 570,260" stroke="url(#glowGradientEditor)" class="arch-beam jump-beam" />
        
        <g class="float-chip" style="animation-delay: 0s">
          <rect x="345" y="206" width="90" height="24" rx="12" fill="var(--vp-c-bg)" stroke="var(--vp-c-brand-3)" stroke-width="1.5" filter="url(#glow)"/>
          <text x="390" y="222" text-anchor="middle" fill="var(--vp-c-text-1)" font-size="11" font-weight="600" font-family="monospace">Alt + Click</text>
        </g>
      </g>

      <!-- Nodes -->
      <!-- IDE/AI Bounding Box -->
      <g transform="translate(620, 180)">
        <rect x="-95" y="-140" width="190" height="280" rx="20" fill="var(--vp-c-bg-soft)" stroke="var(--vp-c-border)" stroke-width="1" stroke-dasharray="4 4" opacity="0.8" />
      </g>

      <!-- Browser Node -->
      <g transform="translate(180, 180)">
        <circle cx="0" cy="0" r="32" fill="var(--vp-c-bg)" stroke="var(--vp-c-brand-1)" stroke-width="2" filter="url(#glow)" />
        <use href="#icon-browser" />
        <text x="0" y="52" text-anchor="middle" fill="var(--vp-c-text-1)" font-size="14" font-weight="600">Browser</text>
      </g>

      <!-- AI Node -->
      <g transform="translate(620, 100)" :style="{ opacity: activeMode === 'jump' ? 0.3 : 1, transition: 'opacity 0.3s' }">
        <circle cx="0" cy="0" r="32" fill="var(--vp-c-bg)" stroke="var(--vp-c-brand-2)" stroke-width="2" filter="url(#glow)" />
        <use href="#icon-ai" />
        <text x="0" y="52" text-anchor="middle" fill="var(--vp-c-text-1)" font-size="14" font-weight="600">AI Assistant</text>
      </g>

      <!-- Editor Node -->
      <g transform="translate(620, 260)" :style="{ opacity: 1, transition: 'opacity 0.3s' }">
        <circle cx="0" cy="0" r="32" fill="var(--vp-c-bg)" stroke="var(--vp-c-brand-3)" stroke-width="2" filter="url(#glow)" />
        <use href="#icon-editor" />
        <text x="0" y="52" text-anchor="middle" fill="var(--vp-c-text-1)" font-size="14" font-weight="600">Source code</text>
      </g>
    </svg>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const activeMode = ref('inspect')
</script>

<style scoped>
.hero-arch-container {
  width: 100%;
  max-width: 100%;
  margin: 16px 0 32px;
  border-radius: 20px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  padding: 16px;
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.05);
  display: flex;
  flex-direction: column;
}

.mode-tabs {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 8px;
}

.mode-tabs button {
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  color: var(--vp-c-text-2);
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
}

.mode-tabs button:hover {
  color: var(--vp-c-text-1);
  background: rgba(148, 163, 184, 0.1);
}

.mode-tabs button.active {
  color: var(--vp-c-brand-1);
  background: rgba(189, 52, 254, 0.08);
  border-color: rgba(189, 52, 254, 0.3);
}

.hero-arch-svg {
  width: 100%;
  height: auto;
  display: block;
}

.arch-track {
  fill: none;
  stroke: var(--vp-c-text-3);
  stroke-width: 2;
  stroke-dasharray: 6 6;
  transition: opacity 0.3s ease;
}

.arch-beam {
  fill: none;
  stroke-width: 4;
  stroke-linecap: round;
  stroke-dasharray: 80 1000;
}

.inspect-beam {
  stroke-dashoffset: 1000;
  animation: shoot 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

.inspect-beam-delayed {
  stroke-dashoffset: 1000;
  animation: shoot 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  animation-delay: 0.5s;
}

.jump-beam {
  stroke-dashoffset: 1000;
  animation: shoot-fast 1.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

@keyframes shoot {
  0% { stroke-dashoffset: 600; opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { stroke-dashoffset: -100; opacity: 0; }
}

@keyframes shoot-fast {
  0% { stroke-dashoffset: 600; opacity: 0; }
  5% { opacity: 1; }
  95% { opacity: 1; }
  100% { stroke-dashoffset: -100; opacity: 0; }
}

.float-chip {
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0% { transform: translateY(0px); }
  50% { transform: translateY(-8px); }
  100% { transform: translateY(0px); }
}

.pulse-dot {
  animation: pulse 1.8s ease-in-out infinite;
}

@keyframes pulse {
  0% { transform: scale(0.8); opacity: 0.5; }
  50% { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(0.8); opacity: 0.5; }
}
</style>
