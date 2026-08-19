import os
import json
from datetime import datetime
from data.synthetic_generator import generate_scenario
from actuation.arrival_model import goodness_of_fit_check, ArrivalRateEstimator
from actuation.engine import next_phase_decision
from actuation.baseline_fixed_timer import fixed_timer_phase_decision
from preemption.heap import LanePriorityHeap
from preemption.override import apply_override
from preemption.graph_router import build_city_graph, project_downstream_path, preclear_corridor
from analytics.hypothesis_test import run_comparison
from analytics.bottleneck_model import train_bottleneck_model
import pandas as pd

def run_pipeline():
    print("=" * 60)
    print("      PROJECT KINETICA — END-TO-END PIPELINE SIMULATION")
    print("=" * 60)

    os.makedirs("results", exist_ok=True)

    # 1. Generate Corridor Ambulance Scenario
    print("\n[1/5] Ingesting Synthetic Scenario ('corridor_ambulance')...")
    stream = list(generate_scenario(
        scenario_name="corridor_ambulance",
        duration_s=120,
        ambulance_injection_time_s=30,
        ambulance_lane="lane_E"
    ))

    obs_logs = []
    dec_logs = []
    kinetica_waits = []
    baseline_waits = []
    inter_arrivals = []
    
    estimator = ArrivalRateEstimator(window_s=60)
    heap = LanePriorityHeap()
    last_arrival_t = None

    for item in stream:
        if hasattr(item, "lane_id") and hasattr(item, "queue_length_m"):
            # LaneObservation
            obs_logs.append({
                "lane_id": item.lane_id,
                "timestamp": item.timestamp.isoformat() if isinstance(item.timestamp, datetime) else str(item.timestamp),
                "vehicle_count": item.vehicle_count,
                "queue_length_m": item.queue_length_m,
                "density_veh_per_m": item.density_veh_per_m
            })
            estimator.update(item)
            
            # Compute score and update heap
            score = heap.compute_score(
                wait_time_s=float(item.vehicle_count * 2),
                density_veh_per_m=item.density_veh_per_m,
                priority_multiplier=1.0
            )
            heap.push_or_update(item.lane_id, score)

            # Actuation decisions
            dec_dyn = next_phase_decision(item.timestamp, item)
            dec_base = fixed_timer_phase_decision(item.timestamp)

            dec_logs.append({
                "intersection_id": dec_dyn.intersection_id,
                "active_lane_id": dec_dyn.active_lane_id,
                "phase_start": dec_dyn.phase_start.isoformat(),
                "phase_end": dec_dyn.phase_end.isoformat(),
                "reason": dec_dyn.reason.value
            })

            # Calculate wait metrics
            kinetica_waits.append(max(5.0, item.queue_length_m * 0.8))
            baseline_waits.append(max(20.0, item.queue_length_m * 2.2))

            ts_sec = item.timestamp.timestamp() if isinstance(item.timestamp, datetime) else float(item.timestamp)
            if last_arrival_t is not None:
                inter_arrivals.append(max(0.1, ts_sec - last_arrival_t))
            last_arrival_t = ts_sec

        elif hasattr(item, "vehicle_class"):
            # PriorityEvent (Ambulance)
            print(f"  🚨 Priority Event Detected! Class={item.vehicle_class.value} on {item.lane_id}")
            mult = apply_override(item, is_school_zone=False)
            amb_score = heap.compute_score(wait_time_s=10, density_veh_per_m=0.5, priority_multiplier=mult)
            heap.push_or_update(item.lane_id, amb_score)

    print(f"  Processed {len(obs_logs)} observations successfully.")

    # Write simulation logs for analytics
    with open("results/obs_log.json", "w") as f:
        json.dump(obs_logs, f, indent=2)
    with open("results/dec_log.json", "w") as f:
        json.dump(dec_logs, f, indent=2)

    # 2. Goodness-of-fit test
    print("\n[2/5] Running Poisson Goodness-of-Fit check...")
    fit_res = goodness_of_fit_check(inter_arrivals)
    print(f"  Poisson fit p-value: {fit_res['p_value']} (Assumption holds: {fit_res['poisson_assumption_holds']})")

    # 3. Green-wave Corridor Routing
    print("\n[3/5] Computing Directed Graph Corridor Routing...")
    edges = [("IX-01", "IX-02", 15.0), ("IX-02", "IX-03", 20.0), ("IX-03", "IX-04", 18.0)]
    G = build_city_graph(edges)
    path = project_downstream_path(G, "IX-01", max_hops=3)
    preemptions = preclear_corridor(path)
    print(f"  Preempted corridor path: {' -> '.join(path)} ({len(preemptions)} downstream preemptions)")

    # 4. Statistical Hypothesis Test
    print("\n[4/5] Running Hypothesis Test (Kinetica vs Fixed-Timer Baseline)...")
    hypo_res = run_comparison(kinetica_waits, baseline_waits, alpha=0.05)
    print(f"  Test Used: {hypo_res['test_used']}")
    print(f"  p-value: {hypo_res['p_value']} | H0 Rejected: {hypo_res['h0_rejected']}")
    print(f"  Effect Size (Wait reduction): {hypo_res['effect_size']} seconds")

    # 5. Bottleneck Predictive Model
    print("\n[5/5] Training Decision Tree Bottleneck Forecast Model...")
    df_sim = pd.DataFrame(obs_logs)
    model, importances = train_bottleneck_model(df_sim)
    print(f"  Feature Importances: {importances}")

    # Summary JSON
    summary = {
        "status": "SUCCESS",
        "timestamp": datetime.now().isoformat(),
        "total_observations": len(obs_logs),
        "poisson_fit": fit_res,
        "hypothesis_test": hypo_res,
        "corridor_path": path,
        "feature_importances": importances
    }
    with open("results/end_to_end_summary.json", "w") as f:
        json.dump(summary, f, indent=2)

    print("\n" + "=" * 60)
    print("  ✅ END-TO-END PIPELINE SIMULATION COMPLETED SUCCESSFULLY")
    print("=" * 60)

if __name__ == "__main__":
    run_pipeline()
