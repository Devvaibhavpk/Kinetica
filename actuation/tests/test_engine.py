from actuation.engine import compute_green_extension

def test_green_duration_scales_with_queue():
    """
    SC1: Asserts that green extension duration strictly monotonically increases
    with queue length.
    """
    t_10m = compute_green_extension(10.0)
    t_50m = compute_green_extension(50.0)
    t_100m = compute_green_extension(100.0)

    assert t_10m < t_50m < t_100m, f"Expected strictly increasing green times: {t_10m}, {t_50m}, {t_100m}"
