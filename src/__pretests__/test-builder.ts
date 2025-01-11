/**
 * Below is the manual testing:
 *   * Create a new project:
 *     - All IndexDB databases will be cleared: ab-tags, action-sets, action-unit-results, action-units, invalid-units
 *     - Not cleared app-config
 *     - project DB has a new key and new value
 *   * Testing Set/Check Tag Values units
 *     - Create Action Set with this name
 *     - Create the following Set/Check Tag Value actions:
 *       • Starting message: RunnerLog: ===>>> Starting test on Set/Check Tag Values units <<<===
 *       • Set initial data: stv_bool = 0, stv_sint = 0, stv_int = 0, stv_dint = 0, stv_real = 0
 *       • Check initial data: stv_bool = 0, stv_sint = 0, stv_int = 0, stv_dint = 0, stv_real = 0
 *       ---
 *       • Set one BOOL: stv_bool to 1
 *       • Check one BOOL: stv_bool is 1
 *       • Set one BOOL: stv_bool to 0
 *       • Check one BOOL: stv_bool is 0
 *       ---
 *       • Set one SINT: stv_sint to -111
 *       • Check one SINT: stv_sint is -111
 *       • Check one SINT bit: stv_sint bit 2 is 0
 *       • Set one SINT bit: stv_sint bit 2 to 1
 *       • Check one SINT bit: stv_sint bit 2 is 1, stv_sint is -107
 *       ---
 *       • Set one INT: stv_int to 957
 *       • Check one INT: stv_int is 957
 *       • Check one INT bit: stv_int bit 13 is 0
 *       • Set one INT bit: stv_int bit 13 to 1
 *       • Check one INT bit: stv_int bit 13 is 1, stv_int is 9149
 *       ---
 *       • Set one DINT: stv_dint to -928399
 *       • Check one DINT: stv_dint is -928399
 *       • Check one DINT bit: stv_dint bit 18 is 0
 *       • Set one DINT bit: stv_dint bit 18 to 1
 *       • Check one DINT bit: stv_dint bit 18 is 1, stv_dint is -666255
 *       ---
 *       • Set one REAL: stv_real to -3.324
 *       • Check one REAL: stv_real is -3.324
 *       • Set one REAL: stv_real to 0
 *       • Check one REAL: stv_real is 0
 *       • Set one REAL: stv_real to 987654.321
 *       • Check one REAL: stv_real is 987654.321
 *       ---
 *       • Set multiple: stv_bool to 0, stv_sint to 44, stv_int to -32768, stv_dint to 951356, stv_real to 951.3578
 *       • Check multiple: stv_bool to 0, stv_sint is 44, stv_int is -32768, stv_dint is 951356, stv_real is 951.3578
 *
 *   * Testing Reset Tag Values
 *     - Create Action Set with this name
 *     - Create the following Reset Tag Value actions
 *       • Starting message: RunnerLog: ===>>> Starting test on Reset Tag Value units <<<===
 *       • Set initial data: reset_bool0 = 0, reset_bool1 = 1, reset_int = 0, reset_real = 0
 *       • Check initial data: reset_bool0 = 0, reset_bool1 = 1, reset_int = 0, reset_real = 0
 *       ---
 *       • Reset BOOL 0: reset_bool0 to 1 for 0.5s
 *       • Reset INT: reset_int to 33 for 2s
 *       • Reset multiple: reset_bool1 to 0 for 1s, reset_int bit 9 to 1 for 4s, reset_real to -12.32 for 0.2s
 *
 *   * Testing Heartbeats and Sleep
 *     - Create Action Set with this name
 *     - Create the following Heartbeat actions
 *       • Starting message: RunnerLog: ===>>> Starting test on Heartbeat and Sleep units <<<===
 *       • Set initial data: pulsar_bool0 = 0, pulsar_bool1 = 1, pulsar_int = 0, pulsar_sint = 0
 *       • Check initial data: pulsar_bool0 = 0, pulsar_bool1 = 1, pulsar_int = 0, pulsar_sint = 0
 *       ---
 *       • Heartbeat 1: pulsar_bool0 = 0/1 each 2s, pulsar_int bit 3 = 0/1 each 5s for 11 seconds
 *       • Check 1.1: pulsar_bool0 = 0, pulsar_int = 0
 *       • Await 2 seconds: 2 sec
 *       • Check 1.2: pulsar_bool0 = 1
 *       • Await 3 seconds: 3 sec
 *       • Check 1.3: pulsar_int bit 3 = 1
 *       • Heartbeat 2: pulsar_bool1 = 1/0 each 2s, pulsar_sint 12/-66 each 4s
 *       • Check 2.1: pulsar_bool1 = 1, pulsar_sint = 12
 *       • Await 2 seconds: 2 sec
 *       • Check 1.2: pulsar_bool1 = 0
 *       • Await 2 seconds: 2 sec
 *       • Check 1.2: pulsar_bool1 = 1, pulsar_sint = -66
 *
 *   * Testing Unit Tests
 *     - Create Action Set with this name
 *     - Create the following Unit Tests
 *       • Starting message: RunnerLog: ===>>> Starting test on Unit Tests <<<===
 *       • Set initial data: ut1_start = 0, ut1_start = 1, ut3_start = 0, ut3_stop = 1, ut3_reset = 0,
 *           ut4_start = 0, ut4_temp = 20, fut1_start = 0
 *       • Check initial data: ut1_start = 0, ut1_start = 1, ut3_start = 0, ut3_stop = 1, ut3_reset = 0,
 *           ut4_start = 0, ut4_temp = 20, ut1_alarm = 0, ut2_alarm = 0, ut3_alarm = 0, ut4_alarm1 = 0,
 *           ut4_alarm2 = 0, ut_sp = 10, fut1_start = 0
 *       ---
 *       • Unit Test 1: Set ut1_start to 1, expect ut1_alarm = 1 in 0 sec
 *       • Unit Test 2: Set ut2_start to 0, expect ut2_alarm = 1 in 2 sec
 *       • Unit Test 3: Set ut3_start to 1, ut3_stop to 0, expect ut3_alarm = 1 in 3.5 sec, reset ut3_reset = 1 for 1 sec
 *       • Unit Test 4: Set ut4_start to 1, ut4_temp to 25, expect ut4_alarm1 = 1 in 0 sec, ut4_alarm2 = 1 and
 *           ut_sp = 15 in 2.4 s, reset ut4_reset = 1 for 1.7 sec
 *       • Failed unit Test 1: fut1_start to 1, expect ut1_alarm = 1 in 2 sec
 *       • Failed unit Test 1: fut1_start to 1, expect fut1_alarm = 1 in 5 sec, monitoring fut1_monitor
 *           (fut2_monitor will changed in 3 seconds)
 *
 *
 */

export const toBeDeveloped = "Automated testing to be developed.";
