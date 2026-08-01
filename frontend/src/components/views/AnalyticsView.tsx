"use client";

import React from "react";

export default function AnalyticsView() {
  return (
    <div className="p-4 md:p-8 space-y-6">


        {/*  Page Header  */}
        <header className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
                <div className="flex items-center gap-3 mb-2">
                    <span className="px-2.5 py-0.5 bg-primary/10 border border-primary/30 rounded-full font-label text-[10px] text-primary uppercase tracking-wider">
                        HYPOTHESIS TEST VALIDATION
                    </span>
                    <span className="text-xs text-on-surface-variant font-telemetry">MODEL VERIFICATION VER. 2.4.1</span>
                </div>
                <h1 className="font-display text-2xl md:text-3xl font-bold text-on-surface tracking-tight">Analytics &amp; Validation</h1>
                <p className="text-on-surface-variant text-sm font-body mt-1">Real-time inferential statistical verification of Kinetica Adaptive Signal Control vs. baseline timer models.</p>
            </div>
            
            <div className="flex items-center gap-3">
                <div className="glass-card px-4 py-2 flex items-center gap-2.5 border border-primary/30">
                    <span className="led-pip led-calm"></span>
                    <span className="font-telemetry text-xs text-primary font-bold">LIVE INFERENCE VERIFIED</span>
                </div>
            </div>
        </header>

        {/*  Main Grid Layout  */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">

            {/*  Hero Module: Statistical Verdict  */}
            <div className="md:col-span-12 glass-card p-4 md:p-4 relative overflow-hidden border border-outline">
                <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between relative z-10">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-9 h-9 rounded-full bg-state-calm/10 border border-state-calm/30 flex items-center justify-center">
                                <span className="material-symbols-rounded text-state-calm text-xl">verified</span>
                            </div>
                            <div>
                                <h2 className="font-display text-xl font-bold text-on-surface">Statistical Verdict: Null Hypothesis H₀ Rejected</h2>
                                <span className="font-label text-[10px] text-primary uppercase tracking-wider">SIGNIFICANCE LEVEL α = 0.05 ENFORCED</span>
                            </div>
                        </div>

                        <p className="text-sm text-on-surface font-body leading-relaxed border-l-2 border-primary pl-4 py-1.5 bg-surface-container/60 rounded-r-lg my-3">
                            <span className="font-semibold text-primary">H₀ rejected at α = 0.05</span> — Kinetica Adaptive Control yields a statistically significant reduction in intersection wait times compared to <span className="font-telemetry font-bold text-secondary" id="activeBaselineLabel">fixed_timer_90s</span> (<span className="font-telemetry font-semibold">p &lt; 0.001</span>, Mann-Whitney U test, <span className="font-telemetry font-semibold">n = 14,204</span>).
                        </p>
                    </div>

                    {/*  Metric Tiles Grid  */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:w-auto w-full">
                        <div className="bg-surface-container rounded-[24px] p-3.5 border border-outline min-w-[130px]">
                            <div className="text-on-surface-variant font-label text-[10px] uppercase tracking-wider mb-1">TEST APPLIED</div>
                            <div className="font-telemetry text-sm font-semibold text-on-surface truncate" id="verdictTestName">Mann-Whitney U</div>
                            <div className="text-[10px] text-on-surface-variant font-telemetry mt-0.5">z = -5.82</div>
                        </div>

                        <div className="bg-surface-container rounded-[24px] p-3.5 border border-outline min-w-[130px]">
                            <div className="text-on-surface-variant font-label text-[10px] uppercase tracking-wider mb-1">STATISTIC (U)</div>
                            <div className="font-telemetry text-base font-bold text-primary tabular-nums" id="verdictStat">14,203.5</div>
                            <div className="text-[10px] text-on-surface-variant font-telemetry mt-0.5">DF: 14,202</div>
                        </div>

                        <div className="bg-surface-container rounded-[24px] p-3.5 border border-primary/30 bg-primary/5 min-w-[130px]">
                            <div className="text-primary font-label text-[10px] uppercase tracking-wider mb-1 font-bold">P-VALUE</div>
                            <div className="font-telemetry text-lg font-bold text-state-calm tabular-nums" id="verdictPValue">0.0004</div>
                            <div className="text-[10px] text-state-calm font-label uppercase tracking-wider font-semibold mt-0.5">p &lt; 0.001 (SIG)</div>
                        </div>

                        <div className="bg-surface-container rounded-[24px] p-3.5 border border-outline min-w-[130px]">
                            <div className="text-on-surface-variant font-label text-[10px] uppercase tracking-wider mb-1">EFFECT SIZE (R)</div>
                            <div className="font-telemetry text-base font-bold text-secondary tabular-nums" id="verdictEffect">0.42</div>
                            <div className="text-[10px] text-secondary font-label uppercase tracking-wider font-semibold mt-0.5">LARGE EFFECT</div>
                        </div>
                    </div>
                </div>

                {/*  Confidence Interval Footer Ribbon  */}
                <div className="mt-5 pt-3.5 border-t border-outline flex flex-wrap items-center justify-between gap-4 text-xs font-telemetry">
                    <div className="flex items-center gap-4 text-on-surface-variant">
                        <span><span className="font-label text-on-surface-variant uppercase mr-1">95% CI FOR MEAN DELAY REDUCTION:</span> <strong className="text-primary" id="verdictCI">[-28.4s, -16.2s]</strong></span>
                        <span>|</span>
                        <span><span className="font-label text-on-surface-variant uppercase mr-1">MEAN WAIT TIME SAVINGS:</span> <strong className="text-state-calm" id="verdictMeanSaving">23.2s / veh</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="led-pip led-calm"></span>
                        <span className="font-label text-[10px] text-on-surface-variant uppercase tracking-wider">VALIDATION PASSED (CRITERIA 1, 2, &amp; 3 SATISFIED)</span>
                    </div>
                </div>
            </div>

            {/*  Wait-Time Distribution Curve Card (Col 8)  */}
            <div className="md:col-span-8 glass-card p-4 flex flex-col justify-between">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
                    <div>
                        <h3 className="font-display text-lg font-bold text-on-surface flex items-center gap-2">
                            <span className="material-symbols-rounded text-primary">bar_chart</span>
                            Wait-Time Density Distribution
                        </h3>
                        <p className="text-xs text-on-surface-variant font-body mt-0.5">Kernel density estimation comparing baseline wait time distributions vs. Kinetica adaptive control.</p>
                    </div>

                    {/*  Interactive Controls  */}
                    <div className="flex flex-wrap items-center gap-2">
                        <select id="baselineSelector" onChange={() => {}} className="industrial-panel border border-outline tech-border text-on-surface text-xs font-label uppercase tracking-wider rounded-full px-3 py-1.5 focus:ring-1 focus:ring-primary focus:outline-none">
                            <option value="fixed_timer">Baseline: Fixed Timer (90s)</option>
                            <option value="scats_actuated">Baseline: SCATS Actuated</option>
                            <option value="webster_optimal">Baseline: Webster Fixed-Cycle</option>
                        </select>

                        <div className="flex bg-surface-container rounded-[24px] p-0.5 border border-outline text-[10px] font-label uppercase">
                            <button onClick={() => {}} id="btnKde" className="px-3 py-1 rounded-full bg-primary text-on-primary font-bold">KDE</button>
                            <button onClick={() => {}} id="btnCdf" className="px-3 py-1 rounded-full text-on-surface-variant hover:text-on-surface">CDF</button>
                        </div>
                    </div>
                </div>

                {/*  Dynamic Chart Container  */}
                <div className="relative w-full h-[300px] bg-surface-container-high rounded-[24px] p-4 border border-outline flex flex-col justify-end">
                    {/*  Y Axis Labels  */}
                    <div className="absolute left-3 top-4 bottom-8 flex flex-col justify-between text-[10px] text-on-surface-variant font-telemetry">
                        <span>0.04</span>
                        <span>0.03</span>
                        <span>0.02</span>
                        <span>0.01</span>
                        <span>0.00</span>
                    </div>

                    {/*  Horizontal Grid lines  */}
                    <div className="absolute left-12 right-4 top-4 border-b border-outline/50"></div>
                    <div className="absolute left-12 right-4 top-1/4 border-b border-outline/50"></div>
                    <div className="absolute left-12 right-4 top-2/4 border-b border-outline/50"></div>
                    <div className="absolute left-12 right-4 top-3/4 border-b border-outline/50"></div>

                    {/*  SVG Distribution Plot  */}
                    <div className="ml-8 w-[calc(100%-2rem)] h-[220px] relative">
                        <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 500 200" id="distributionSvg">
                            <defs>
                                <linearGradient id="baselineGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" stopColor="#f0a25d" stopOpacity="0.3"/>
                                    <stop offset="100%" stopColor="#f0a25d" stopOpacity="0"/>
                                </linearGradient>
                                <linearGradient id="kineticaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" stopColor="#79b4a9" stopOpacity="0.4"/>
                                    <stop offset="100%" stopColor="#79b4a9" stopOpacity="0"/>
                                </linearGradient>
                            </defs>

                            {/*  Baseline Curve (Warm Industrial Amber)  */}
                            <path id="baselineFill" d="M 0,200 Q 150,190 260,40 T 500,200 Z" fill="url(#baselineGrad)"/>
                            <path id="baselineStroke" d="M 0,200 Q 150,190 260,40 T 500,200" fill="none" stroke="#f0a25d" strokeWidth="2"/>

                            {/*  Kinetica Curve (Muted Sage Teal)  */}
                            <path id="kineticaFill" d="M 0,200 Q 80,180 170,20 T 400,200 Z" fill="url(#kineticaGrad)"/>
                            <path id="kineticaStroke" d="M 0,200 Q 80,180 170,20 T 400,200" fill="none" stroke="#79b4a9" strokeWidth="2.5"/>

                            {/*  Mean Indicators  */}
                            <line id="kineticaMeanLine" x1="170" y1="20" x2="170" y2="200" stroke="#79b4a9" strokeWidth="1.5" strokeDasharray="3,3"/>
                            <line id="baselineMeanLine" x1="260" y1="40" x2="260" y2="200" stroke="#f0a25d" strokeWidth="1.5" strokeDasharray="3,3"/>
                        </svg>

                        {/*  Floating Stat Badges on Graph  */}
                        <div id="kineticaMeanBadge" className="absolute left-[30%] top-[8%] bg-surface-container-high/90 border border-primary/40 px-3 py-1 rounded-full text-xs font-telemetry text-primary shadow-lg backdrop-blur-md">
                            Kinetica <span className="font-label text-[10px] text-on-surface-variant">μ =</span> <strong id="valKineticaMean">58.2s</strong>
                        </div>
                        <div id="baselineMeanBadge" className="absolute left-[50%] top-[18%] bg-surface-container-high/90 border border-secondary/40 px-3 py-1 rounded-full text-xs font-telemetry text-secondary shadow-lg backdrop-blur-md">
                            Baseline <span className="font-label text-[10px] text-on-surface-variant">μ =</span> <strong id="valBaselineMean">85.4s</strong>
                        </div>
                    </div>

                    {/*  X Axis Labels  */}
                    <div className="ml-8 w-[calc(100%-2rem)] flex justify-between text-[10px] text-on-surface-variant font-telemetry pt-2 border-t border-outline">
                        <span>0s</span>
                        <span>25s</span>
                        <span>50s</span>
                        <span>75s</span>
                        <span>100s</span>
                        <span>125s</span>
                        <span>150s</span>
                    </div>
                </div>

                {/*  Legend & Summary Footer  */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-outline text-xs">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-secondary"></span>
                            <span className="font-label text-on-surface-variant uppercase tracking-wider" id="legendBaselineName">Baseline Fixed Timer (90s)</span>
                            <span className="font-telemetry text-secondary font-bold" id="legendBaselineVal">μ = 85.4s (σ = 24.1s)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
                            <span className="font-label text-on-surface-variant uppercase tracking-wider">Kinetica Adaptive</span>
                            <span className="font-telemetry text-primary font-bold" id="legendKineticaVal">μ = 58.2s (σ = 11.6s)</span>
                        </div>
                    </div>

                    <div className="font-telemetry text-xs text-state-calm font-bold">
                        95th Percentile Delay Reduced from <span id="p95Baseline" className="text-secondary">142s</span> → <span id="p95Kinetica" className="text-primary">82s</span> (-42.2%)
                    </div>
                </div>
            </div>

            {/*  Right Column Stack (Col 4)  */}
            <div className="md:col-span-4 flex flex-col gap-4">

                {/*  Feature Importance Breakdown (SHAP / Gini)  */}
                <div className="glass-card p-4 flex-1 flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="font-display text-base font-bold text-on-surface flex items-center gap-2">
                                <span className="material-symbols-rounded text-primary">account_tree</span>
                                Model Feature Importance
                            </h3>
                            <span className="px-2 py-0.5 bg-primary/10 border border-primary/30 rounded-full text-[10px] font-label text-primary uppercase">
                                SHAP / Gini
                            </span>
                        </div>
                        <p className="text-xs text-on-surface-variant font-body mb-4">Feature weight contributions to Phase Extension decisions in Kinetica Bottleneck Engine.</p>

                        {/*  Features list  */}
                        <div className="space-y-3.5">
                            {/*  Feature 1  */}
                            <div>
                                <div className="flex justify-between text-xs font-telemetry mb-1">
                                    <span className="text-on-surface font-medium">Queue Length (N)</span>
                                    <span className="text-primary font-bold" id="featWeightN">0.42</span>
                                </div>
                                <div className="h-1.5 w-full bg-surface-container-high rounded-[24px] overflow-hidden">
                                    <div className="h-full bg-primary rounded-full bar-transition" style={{'width': '42%'}} id="featBarN"></div>
                                </div>
                            </div>

                            {/*  Feature 2  */}
                            <div>
                                <div className="flex justify-between text-xs font-telemetry mb-1">
                                    <span className="text-on-surface font-medium">Arrival Rate (λ)</span>
                                    <span className="text-primary font-bold" id="featWeightLambda">0.28</span>
                                </div>
                                <div className="h-1.5 w-full bg-surface-container-high rounded-[24px] overflow-hidden">
                                    <div className="h-full bg-primary/80 rounded-full bar-transition" style={{'width': '28%'}} id="featBarLambda"></div>
                                </div>
                            </div>

                            {/*  Feature 3  */}
                            <div>
                                <div className="flex justify-between text-xs font-telemetry mb-1">
                                    <span className="text-on-surface font-medium">Time of Day / Phase</span>
                                    <span className="text-secondary font-bold" id="featWeightTime">0.15</span>
                                </div>
                                <div className="h-1.5 w-full bg-surface-container-high rounded-[24px] overflow-hidden">
                                    <div className="h-full bg-secondary rounded-full bar-transition" style={{'width': '15%'}} id="featBarTime"></div>
                                </div>
                            </div>

                            {/*  Feature 4  */}
                            <div>
                                <div className="flex justify-between text-xs font-telemetry mb-1">
                                    <span className="text-on-surface font-medium">Upstream Platoon Density</span>
                                    <span className="text-on-surface-variant font-bold" id="featWeightPlatoon">0.09</span>
                                </div>
                                <div className="h-1.5 w-full bg-surface-container-high rounded-[24px] overflow-hidden">
                                    <div className="h-full bg-outline rounded-full bar-transition" style={{'width': '9%'}} id="featBarPlatoon"></div>
                                </div>
                            </div>

                            {/*  Feature 5  */}
                            <div>
                                <div className="flex justify-between text-xs font-telemetry mb-1">
                                    <span className="text-on-surface font-medium">Weather / Surface Friction</span>
                                    <span className="text-on-surface-variant/70 font-bold" id="featWeightFriction">0.06</span>
                                </div>
                                <div className="h-1.5 w-full bg-surface-container-high rounded-[24px] overflow-hidden">
                                    <div className="h-full bg-outline-variant rounded-full bar-transition" style={{'width': '6%'}} id="featBarFriction"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-outline flex items-center justify-between text-xs font-telemetry text-on-surface-variant">
                        <span>bottleneck_model.py</span>
                        <span className="text-primary">RandomForest &amp; LightGBM</span>
                    </div>
                </div>

                {/*  Poisson Goodness-of-Fit Card  */}
                <div className="glass-card p-4">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="font-display text-base font-bold text-on-surface flex items-center gap-2">
                            <span className="material-symbols-rounded text-secondary">show_chart</span>
                            Poisson Arrival Fit Match
                        </h3>
                        <span className="px-2 py-0.5 industrial-panel border border-outline tech-border rounded-[24px] font-telemetry text-[10px] text-on-surface-variant">
                            Poisson(λ=0.42)
                        </span>
                    </div>

                    <div className="flex items-center gap-3 my-2">
                        {/*  Mini Histogram Bars  */}
                        <div className="w-20 h-12 flex items-end gap-1 shrink-0 p-1 bg-surface-container-high rounded-[24px] border border-outline">
                            <div className="w-3 bg-secondary/40 h-[25%] rounded-t-sm"></div>
                            <div className="w-3 bg-secondary/70 h-[65%] rounded-t-sm"></div>
                            <div className="w-3 bg-secondary h-[100%] rounded-t-sm"></div>
                            <div className="w-3 bg-secondary/80 h-[75%] rounded-t-sm"></div>
                            <div className="w-3 bg-secondary/40 h-[35%] rounded-t-sm"></div>
                        </div>

                        <div>
                            <div className="text-on-surface-variant font-label text-[10px] uppercase tracking-wider mb-1">CHI-SQUARE GOF TEST</div>
                            <div className="flex items-baseline gap-2">
                                <span className="font-telemetry text-sm font-bold text-on-surface">χ² = <strong id="chiSquareVal">3.14</strong></span>
                                <span className="font-telemetry text-xs text-state-calm font-bold">p = <strong id="chiPVal">0.68</strong></span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-state-calm font-label uppercase tracking-wider font-semibold mt-1">
                                <span className="material-symbols-rounded text-sm">check_circle</span>
                                <span>✓ FIT ACCEPTABLE (p &gt; 0.05)</span>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/*  Scenario Sandbox Control Panel (Col 12)  */}
            <div className="md:col-span-12 glass-card p-4 md:p-4 border border-outline">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-5">
                    <div>
                        <h3 className="font-display text-lg font-bold text-on-surface flex items-center gap-2">
                            <span className="material-symbols-rounded text-primary">tune</span>
                            Interactive Parameter Sensitivity &amp; Validation Sandbox
                        </h3>
                        <p className="text-xs text-on-surface-variant font-body mt-0.5">Adjust traffic arrival rate λ and maximum green extension buffer to observe real-time predicted delay savings and p-value stability.</p>
                    </div>

                    <button onClick={() => {}} className="px-4 py-2 bg-surface-container hover:industrial-panel border border-outline tech-border text-on-surface text-xs font-label uppercase tracking-wider rounded-full transition-all flex items-center gap-2">
                        <span className="material-symbols-rounded text-sm">refresh</span>
                        <span>Reset Parameters</span>
                    </button>
                </div>

                {/*  Sliders Grid  */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                    {/*  Slider 1: Traffic Volume Lambda  */}
                    <div className="bg-surface-container p-4.5 rounded-[24px] border border-outline">
                        <div className="flex justify-between items-center mb-2">
                            <span className="font-label text-xs text-on-surface-variant uppercase tracking-wider">TRAFFIC ARRIVAL RATE (λ)</span>
                            <span className="font-telemetry text-sm font-bold text-primary" id="sliderLambdaVal">0.42 <span className="font-label text-[10px] text-on-surface-variant">VEH/S</span></span>
                        </div>
                        <input type="range" min="0.10" max="1.20" step="0.05" value="0.42" id="sliderLambda" onChange={() => {}} className="w-full h-2 bg-surface-container-high rounded-[24px] appearance-none cursor-pointer accent-primary"/>
                        <div className="flex justify-between text-[10px] font-telemetry text-on-surface-variant mt-2">
                            <span>0.10 (Off-peak)</span>
                            <span>0.60 (Medium)</span>
                            <span>1.20 (Saturation)</span>
                        </div>
                    </div>

                    {/*  Slider 2: Green Extension Buffer  */}
                    <div className="bg-surface-container p-4.5 rounded-[24px] border border-outline">
                        <div className="flex justify-between items-center mb-2">
                            <span className="font-label text-xs text-on-surface-variant uppercase tracking-wider">MAX GREEN EXTENSION BUFFER</span>
                            <span className="font-telemetry text-sm font-bold text-secondary" id="sliderBufferVal">4.2 <span className="font-label text-[10px] text-on-surface-variant">SEC</span></span>
                        </div>
                        <input type="range" min="2.0" max="10.0" step="0.2" value="4.2" id="sliderBuffer" onChange={() => {}} className="w-full h-2 bg-surface-container-high rounded-[24px] appearance-none cursor-pointer accent-secondary"/>
                        <div className="flex justify-between text-[10px] font-telemetry text-on-surface-variant mt-2">
                            <span>2.0s (Tight)</span>
                            <span>5.0s (Optimal)</span>
                            <span>10.0s (Relaxed)</span>
                        </div>
                    </div>

                    {/*  Live Sandbox Output Summary Card  */}
                    <div className="bg-surface-container p-4.5 rounded-[24px] border border-primary/30 bg-primary/5 flex flex-col justify-between">
                        <div className="flex justify-between items-center">
                            <span className="font-label text-xs text-primary font-bold uppercase tracking-wider">PREDICTED METRIC OUTPUT</span>
                            <span className="led-pip led-calm"></span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 my-2 font-telemetry">
                            <div>
                                <span className="text-[10px] text-on-surface-variant font-label uppercase">ESTIMATED WAIT REDUCTION</span>
                                <div className="text-sm font-bold text-state-calm" id="sandboxOutSaving">-27.2s / veh</div>
                            </div>
                            <div>
                                <span className="text-[10px] text-on-surface-variant font-label uppercase">ESTIMATED P-VALUE</span>
                                <div className="text-sm font-bold text-primary" id="sandboxOutP">0.0004</div>
                            </div>
                        </div>

                        <div className="text-[10px] font-telemetry text-on-surface-variant">
                            Confidence Bound: <strong className="text-on-surface" id="sandboxOutCI">[-28.4s, -16.2s]</strong>
                        </div>
                    </div>

                </div>
            </div>

        </div>
    </div>

  );
}
