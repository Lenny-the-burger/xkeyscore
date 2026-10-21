
===== selection-forwarding-readme page 1 =====
UNCLASSIFED//FOR OFFICIAL USE ONLY

(U//FOUO) Forwarding Selected
MAILORDER Files Read Me

(U//FOUQ) This document explains how to configure an XKS cluster to forward selected sessions via
MAILORDER. Sessions are still scanned, tagged, and queryable in XKEYSCORE, even if the quota limit
(category throttling) has been exceeded for the day. Use this document to learn the procedures for
switching all Digital Network Intelligence (DNI) filtering and selection to the XKEYSCORE collection

system.

(U//FOUO) Configuring DNI Selection in xks.config

(U//FOUO) Follow these steps to configure xks.config to use the XKS collection system for DNI filtering
and selection:

1.

2.

(U//FOUO) Logon as the user oper.

(U//FOUO) At the command line from within any directory, type vi config and then press
Enter. The xks.config file will open.

(U//FOUO) In the Inputs section of xks. config set the following configurations:

a.

forward sessions = yes : This enables session forwarding on the
selected output plugin. You can verify that session forwarding is setto yes in the
default.xmi file located in SXSCORE DIR/config/plugins

Note: Only after running the xks getup plugins process, described on page 2, will
you see the selected_output plugin enabled in default.xml.

category throttle = true (default). This sets the maximum number of
sessions per category to 10,000 and the total size forwarded for any given category to be no
greater than 1GB. If either of these limits is reached, XKEYSCORE will no longer forward
sessions that hit on that particular category for the rest of the day. It will, however,
continue to process data for other categories. These limits are reset every 24 hours.

All MAILORDER files will be stored on the Master server in:
/export/data/xkeyscore/outputs/mailorder

1 |

UNCLASSIFED//FOR OFFICIAL USE ONLY

===== selection-forwarding-readme page 2 =====
UNCLASSIFIED//FOR OFFICIAL USE ONLY

You can check the status of the category throttle using one of the following commands:

*e mysqls quota status current
The quota_limits forwarding status for all categories.

e mysqls quota status yesterday
The quota limits forwarding status for the previous day.

* mysqls quota throttled current
The top 20 categories for the current day (The phrase “negative remaining”
indicates the category was throttled).

d. output location = master : All MAILORDER files will be generated in:

/xks_data/<masterHostname>/outputs/mailorder_working

Then the mailorder proc process on the Master will rename and move them to:
/xks_data/<masterHostname>/outputs/mailorder

e. mailorder = yes (default) : Onthe Master, this creates the
mailorder proc process that polls themailorder working directory and then
moves/renames any MAILORDER files to SXSCORE DATA DIR/outputs/mailorder.

4, (U//FOUO) Type :wq! andthen press Enter to save and exit xks.config.

(U//FOUO) Additional Processes

(U//FOUO) In addition to editing the configurations in xks. config, itis important to run several set-up
processes.

1. (U/f/FOUO) As the oper user, at the command prompt, type xks setup plugins and press
Enter. This ensures any applicable changes to plugin configurations will take effect.

2. (U//FOUOQ) As the oper user, at the command prompt, type xks setup processes and
press Enter. This will create the mailorder proc process on the Master.

3. (U//FOUO) At the command prompt, type rsync push config and press Enter. This
pushes the latest configuration changes to the slaves.

4. (U//FOUO) As the oper user, at the command prompt, type xks proc start and press
Enter . This will ensure all of the running processes pick up any configuration changes.

5. (U//FOUO) At the command prompt, type xks proc saferestart and press Enter. After
setup is complete, this restarts process datas for the new configurations to take effect.

2 |

UNCLASSIFIED//FOR OFFICIAL USE ONLY
