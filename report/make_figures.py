"""
Generates publication-grade scientific architectural diagrams for Project Kinetica report.
Delegates to the master publication suite in report.make_all_figures.
"""
from report.make_all_figures import (
    make_fig_1_1_architecture as generate_fig_1_1,
    make_fig_3_2_homography_pipeline as generate_fig_3_2,
    make_fig_3_3_max_heap as generate_fig_3_3,
    make_fig_3_4_corridor_green_wave as generate_fig_3_4,
)

if __name__ == '__main__':
    generate_fig_1_1()
    generate_fig_3_2()
    generate_fig_3_3()
    generate_fig_3_4()
    print('All publication figures successfully updated in results/figures/')
