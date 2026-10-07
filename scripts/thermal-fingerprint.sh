#!/usr/bin/env bash
# thermal-fingerprint.sh: record the host state a thermal measurement belongs to.
#
# A frequency/power/temperature number is only meaningful next to the machine and
# the policy that produced it. This prints that state, and a single hash over the
# part of it that must not drift between two runs you intend to compare.
#
# Read-only: it touches sysfs, /etc/tlp.conf and systemd unit files, nothing else.
# Unprivileged. Run it on the machine that took the measurement:
#
#   ./scripts/thermal-fingerprint.sh
#
# Deliberately NOT in the hashed block: temperatures, since-boot throttle
# counters, and anything else that moves while the host is up. Those are printed
# as "captured", because a hash over a moving value tells you nothing.
set -uo pipefail

read_first() { # read_first <file> [fallback]
    if [ -r "$1" ]; then
        head -n1 "$1" 2>/dev/null | tr -d '\n'
    else
        printf '%s' "${2:-n/a}"
    fi
}

mem_kb() { awk '/^MemTotal:/ {print $2}' /proc/meminfo 2>/dev/null || echo 0; }

cpu_model() { awk -F': ' '/^model name/ {print $2; exit}' /proc/cpuinfo 2>/dev/null; }

threads() { grep -c '^processor' /proc/cpuinfo 2>/dev/null || echo 0; }

os_pretty() {
    # shellcheck disable=SC1091
    [ -r /etc/os-release ] && . /etc/os-release && printf '%s' "${PRETTY_NAME:-n/a}" || printf 'n/a'
}

throttle_sum() {
    local f v t=0
    for f in /sys/devices/system/cpu/cpu*/thermal_throttle/*_count; do
        [ -r "$f" ] || continue
        v="$(cat "$f" 2>/dev/null)" || continue
        case "$v" in ''|*[!0-9]*) continue ;; esac
        t=$(( t + v ))
    done
    printf '%s' "$t"
}

pkg_temp_c() {
    local h lbl
    for h in /sys/class/hwmon/hwmon*; do
        [ -r "$h/name" ] || continue
        [ "$(cat "$h/name" 2>/dev/null)" = "coretemp" ] || continue
        for lbl in "$h"/temp*_label; do
            [ -r "$lbl" ] || continue
            if [ "$(cat "$lbl" 2>/dev/null)" = "Package id 0" ]; then
                awk '{printf "%d", $1/1000}' "${lbl%_label}_input" 2>/dev/null
                return
            fi
        done
    done
    printf 'n/a'
}

# The TLP keys matter more than the rest: they are the knob the experiment moves.
tlp_key() { grep -E "^$1=" /etc/tlp.conf 2>/dev/null | head -n1 | cut -d= -f2- || true; }

# One job may use all 8 logical CPUs; raised from 600% on 2026-10-01.
cpu_quota() {
    local f found=""
    for f in /etc/systemd/system/actions.runner.*.service.d/ci-cpu-policy.conf; do
        [ -r "$f" ] || continue
        found="$(grep -E '^CPUQuota=' "$f" 2>/dev/null | head -n1 | cut -d= -f2-)"
        [ -n "$found" ] && break
    done
    printf '%s' "${found:-n/a}"
}

# The published output is redacted by default. A fingerprint that names the host,
# its exact kernel patch level, its memory and its uptime is a targeting aid, and
# none of that is needed to compare two machines' CPU policy. FULL=1 prints them
# for your own records.
FULL="${FULL:-0}"

kernel_series() { uname -r | sed -E 's/^([0-9]+\.[0-9]+)\..*/\1.x/'; }

KERNEL_LINE="kernel_series=$(kernel_series)"
MEM_LINE=""
UPTIME_LINE=""
if [ "$FULL" = "1" ]; then
    KERNEL_LINE="kernel=$(uname -r)"
    MEM_LINE="mem_total_kib=$(mem_kb)
"
    UPTIME_LINE="uptime_s=$(cut -d. -f1 /proc/uptime 2>/dev/null)"
fi

BLOCK="$(
    cat <<EOF
cpu=$(cpu_model)
threads=$(threads)
$MEM_LINE$KERNEL_LINE
os=$(os_pretty)
scaling_driver=$(read_first /sys/devices/system/cpu/cpu0/cpufreq/scaling_driver)
governor=$(read_first /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor)
intel_pstate.max_perf_pct=$(read_first /sys/devices/system/cpu/intel_pstate/max_perf_pct)
intel_pstate.no_turbo=$(read_first /sys/devices/system/cpu/intel_pstate/no_turbo)
intel_pstate.turbo_pct=$(read_first /sys/devices/system/cpu/intel_pstate/turbo_pct)
tlp.CPU_MAX_PERF_ON_AC=$(tlp_key CPU_MAX_PERF_ON_AC)
tlp.CPU_BOOST_ON_AC=$(tlp_key CPU_BOOST_ON_AC)
tlp.CPU_SCALING_GOVERNOR_ON_AC=$(tlp_key CPU_SCALING_GOVERNOR_ON_AC)
runner.CPUQuota=$(cpu_quota)
experiment.cooldown_gate_c=56
experiment.clamp_floor_khz=800000
experiment.hot_threshold_c=95
experiment.turbo_max_khz=3400000
EOF
)"

HASH="$(printf '%s\n' "$BLOCK" | sha256sum | cut -d' ' -f1)"

echo "thermal fingerprint: captured $(date -Is)"
echo
echo "config-hash: sha256:${HASH}"
echo
echo "--- hashed block (stable while the host policy is unchanged) ---"
printf '%s\n' "$BLOCK"
echo "--- end hashed block ---"
echo
echo "--- captured now (moves while the host is up; never hashed) ---"
echo "package_temp_c=$(pkg_temp_c)"
echo "throttle_count_since_boot=$(throttle_sum)"
for z in /sys/class/thermal/thermal_zone*; do
    [ -r "$z/type" ] || continue
    printf 'thermal_zone.%s=%s temp_c=%s trip0=%s/%s policy=%s\n' \
        "$(cat "$z/type" 2>/dev/null)" \
        "$(basename "$z")" \
        "$(awk '{printf "%d", $1/1000}' "$z/temp" 2>/dev/null)" \
        "$(read_first "$z/trip_point_0_temp")" \
        "$(read_first "$z/trip_point_0_type")" \
        "$(read_first "$z/policy")"
done
[ -n "$UPTIME_LINE" ] && echo "$UPTIME_LINE"
[ "$FULL" = "1" ] || echo "(redacted: hostname never printed; exact kernel patch level, memory and uptime require FULL=1)"
