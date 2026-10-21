
===== stats-config-readme page 1 =====
SECRET//REL TO USA, AUS, CAN, GBR, NZL

(S//REL) Statistics Configuration
Read Me

(S//REL) Statistics configurations are stored in two locations: xks.config and xks.advanced.config. Some
of the configurations are only available on systems running versions of XKEYSCORE prior to version

1.5.10. These are noted in the description of each configuration. Follow these steps to change the

statistics configurations.

xks. config

1. (S//REL) At the command line from within any directory, type viconfig and press Enter.
The xks. config file will open. There are three statistics configurations:

a. stats connect to =

Iv.

Version: 1.5.9 and prior

Default: no value
Description: ldentifies the hostname of the system that collects statistics on a

cluster. If this value is blank, statistics will be collected on the master. This
configuration has been used in cases where a cluster is split into a front end and
a back end, in which case the master of the back end usually collects and sends
statistics to stats_central.

Action: Keep the default (no value) to use the hostname of the master of the
cluster. Or, type the specific hostname of a machine on which statistics should
be collected.

b. stat system designator =

Iv.

All Versions

Default: no value

Description: Identifies the system for which statistics are being collected by
appending a unique name to the SIGAD of the system.

Action: Keep the default value if the system has one cluster. If the system has
multiple clusters, then type a unique name for each cluster. For example, type
xkeyl1 for one cluster and xke y2 for another cluster. A single entry is made

for each cluster that is named:

stat system designator{0} xkeyl,
stat system designator{1} = xkey2, etc.

Classified \, iz

Derived From: NSA/CSSM 1-52
Dated: 20070108
Declassify On: 20370901

SECRET//RELTO USA, AUS, CAN, GBR, NZL

===== stats-config-readme page 2 =====
SECRET//REL TO USA, AUS, CAN, GBR, NZL

c. send stats home = yes
i. All Versions

ii. Default: no value

iii. Description: Confirms that statistics files will be created. Delivery of these files
to stats_central is completed using MAILORDER or some other site-specific file
transfer mechanism.

iv. Action: Keep the default to have statistics files created. Type no if the current
system is to be used as a statistics database/viewer or if statistics should not be
collected.

2. (U//FOUO) Make any desired changes to the configurations.

3. (5//REL) Type : wa! and press Enter to exit xks. config.

xks.advanced.config

1. (S//REL) At the command line from within any directory, type viadvanced and press Enter
to edit the xks.advanced.config file. There are five statistics configurations:

a. stats central = no
i. Default: no

li. All Versions

iii. Description: Determines if the current system is to be used as a stats
database/ viewer. This system cannot be used for processing and must have
statistics files routed to it via MAILORDER.

iv. Action: Keep the default if you do not want the system to be the stats
database/viewer. Type yes if you want the current system to be used to display
metrics.

Important: There is a comment about this parameter in xks.config.in, but the
configuration should be set here. Setting the value in xks.config will override the
value in xks.advanced.config.

b. stats dest trigraph = XKJ
i. Default: XKT
ii. All Versions
ili. Description: ldentifies the trigraph used when creating statistics MAILORDER
files.

Note: This configuration is transparent to the system at site. However, if site
administrators want to send stats to stats-central using a trigraph other than
XKJ, then this must be coordinated with MAILORDER.

2 |
SECRET//RELTO USA, AUS, CAN, GBR, NZL

===== stats-config-readme page 3 =====
SECRET//REL TO USA, AUS, CAN, GBR, NZL

iv. Action: Keep the default for data to be sent to stats_central using trigraph XK).
Type a different trigraph to route data elsewhere.

c. stats_input_topics =
i. Default: no value

li. 1.5.9 and prior only.
iii. Description: Identifies which statistics are collected by the system.

Note: This option is present in xks.advanced.config but it is ignored in version
1.5.9.

iv. Action: Keep the default value to ensure all default statistics are collected. Do
not change unless otherwise directed by an XKEYSCORE developer.

d. mp_stats = false/true
i. Default: alse or no value for version 1.5.9 and prior; true for version 1.5.10.

ii. Version: 1.5.9 and prior
iii. Description: Directs the XKEYSCORE process to collect

generic info stats.

iv. Action: Type true to collect generic_info statistics using the API stats call
(xks::inc_stat). Type false to ignore generic_info statistics.

Note: you can use the send mp kw stats command line argument to direct
XKEYSCORE to collect microplugin and keyword statistics.

e. mp stats interval = 900
i. Default: 900 seconds
li. Version: 1.5.9 and prior
iii. Description: Sets the collection interval for the microplugin statistics. Any value
(in seconds) may be entered.

Note: This is no longer in the config file, but it is still honored.

iv. Action: Keep the default value unless otherwise directed by an XKEYSCORE

developer.

3. (5//REL) Type : wa! and press Enter to exit xks.advanced. config.

3 |
SECRET//RELTO USA, AUS, CAN, GBR, NZL

===== stats-config-readme page 4 =====
SECRET//REL TO USA, AUS, CAN, GBR, NZL

Key Terms

Cluster: A single Master and 0 ton Slaves. A system may have front-end and/or back-end clusters. Front-
end clusters perform raw packet collection and back-end clusters perform protocol processing.

Master: A single machine that runs the XKEYSCORE software and distributes the configuration to all
Slaves in its cluster. At a site with multiple systems and an Overlord, the Master receives its

configuration from its Overlord.

Overlord: A single machine that runs the XKEYSCORE software and controls the clusters in a complex
system. It passes configuration files to the individual Masters.

Site: A single SIGINT Activity Designator (SIGAD). A site may contain 1 ton systems.

Slave: A single machine running the XKEYSCORE software that receives its configuration from its cluster
Master.

System: One ton clusters and 0 or 1 overlord.

4 |
SECRET//RELTO USA, AUS, CAN, GBR, NZL
