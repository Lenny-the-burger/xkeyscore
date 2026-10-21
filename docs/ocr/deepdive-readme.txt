
===== deepdive-readme page 1 =====
(U) Overview

(C) The purpose of this document is to provide procedures to configure an XKEYSCORE server as a
DEEPDIVE server. DEEPDIVE can be defined as featuring a filter in front of the traditional XKEYSCORE
processor (back-end). It is a Federated Query system that has a rolling buffer of all unfiltered data

CONFIDENTIAL

(U//FOUO) DEEPDIVE
Configuration Read Me

processed by XKEYSCORE. One query scans all sites.

(U//FOUQO) DEEPDIVE has two distinct functions. The Front End ingests various input types (e.g., .pcap,

sff, Ethernet, sdh, and sotf packets), sessionizes the data and promotes the data to the Back End. The

backend can also ingest different input types and uses tools such as packet_splatter, xks_xfip (a Fast IP
sessionizer), METTLESOME, PROMOTER (optional), defrag, and sotf_output.

(C) The DEEPDIVE Back End performs strong (e-mail) and soft (content) selection and provides real-time

tipping. It uses GENESIS Appid/Fingerprints which are updated hourly to all accessible field sites. An

appid identifies a specific protocol and details of a session. Fingerprints flag sessions that meet specific

criteria.

(U//FOUO) DEEPDIVE Dataflow

(U//FOUO) Data packets “enter” DEEPDIVE’s front-end, are processed and are fully sessionized before
being passed to the back-end. The data is then analyzed, processed and released or stored as the

mission dictates.

(C)

DEEPDIVE

Packet

Splatter

Front End

Mettlesome

Promoter

he

Dictionary

Defrac .
7 SCanner

Back End

<a oy

) Microplugins |

qm Es

Packers |»,

—=4

Portia! Sessions |,

4

FUN SESSIONS |
ff

(C)

(U//FOUOQ) XKS Deep Dive can be configured differently at each site depending on the priorities of your

mission.

CONFIDENTIAL

1 |

===== deepdive-readme page 2 =====
CONFIDENTIAL

(U//FOUO) Configuring DEEPDIVE for MINUTEMAN in xks.config

(U//FOUO) Use these configurations if your front-end system is outputting SOTF packets only to an XKS
DEEPDIVE. If this is the case, then follow these steps to configure DEEPDIVE for the MINUTEMAN
program only after XKEYSCORE software has been installed:

1.

2.

5.

(U) Logon as the user oper.

(U//FOUQ) At the command line from within any directory, type vi config and then press
Enter. The xks.config file will open.

(U//FOUO) In the Signal Acquisition configuration section of xks.config, confirm:

a. signal acquisition enable = yes : Bysetting this option to yes,
signal_acquisition processes and any associated configurations will be added to
proc_resources.

b. signal acquisition on master = yes : Thiscreatesa
signal acquisition base onthe Master.

c. have promoter = false : Thisindicates no promoter is configured for the system.
d. splatter_hosts = [master_hostname]

In this case, master hostname is the actual hostname of the Master server. Setting
splatter hosts equal tomaster hostname indicates that the master is the only
back-end host to receive the SOTF file (e.g., xks01, xksO2, etc.).

(C) In the {signal acquisition] section of xks.config, type:

Signal acquisition[%S:base] = sigad = US-XXX, config =
signal acquisition.config, front end only = False

(C) In this case, the commas separate three options:

e [%:base] = sigad = US-XXX :Thiscreatesa signal acquisition base
process on each host in the XKS cluster and configures each to the US SIGAD (XXX) that
is carrying the data.

Important: (U//FOUQ) On each host, do not forget to change master hostname to
the appropriate Master server hostname.

e Config = signal acquisition.config : Sets the configuration file to
SXSCORE_DIR/config/signal_acquisition/signal_acquisition.config

e front end only = False : Indicates the host will act as both a front-end and a
back-end host.

(U//FOUQO) Type :wq! andthen press Enter to save and exit xks.config. You will now
configure signal_acquisition.config.

2 |

CONFIDENTIAL

===== deepdive-readme page 3 =====
(U//FOUO) Completing the Configuration of DEEPDIVE for MINUTEMAN

CONFIDENTIAL

(U//FOUO) To complete the configuration of DEEPDIVE for MINUTEMAN, be sure to configure

signal_acquisition.config:

1. (U//FOUO) At the command line from within any directory, type sa—config and then press

Enter. This will take you to SXSCORE/config/signal_acquisition.

2. (U//FOUO) Open signal_acquisition.config, or create a file by that name if it does not already

exist. This file will be used to configure several front-end processes for ingesting, sessionizing,

and reassembling data. Each process is described in the following table.

(U//FOUQ)
| Front-End Processes
What It’s Called What It Does What It Means
Ingests packets (from files, from | Ifit’s a packet stream, it can
Packet Splatter the network, from a capture probably be fed into a
card) in a variety of formats. DEEPDIVE.
MF Fast reassembly of TCP/IPv4 and ooo enn eter kin 2
P UDP/IPv4 streams*. eyeing Detor S
keep/drop decision.
Reassembly of streams from less
METTLESOME
common protocol stacks.
Rule-based filtering of DEEPDIVE intelligently
reassembled sessions, based on
Promoter chooses the most useful
keyword, country code or ,
ate: traffic for retention.
appid/fingerprint.
Enough content available to
Defrag Fully rebuilds sessions** do full decoding/document
descent at the Back End
*up toa 256K limit
**up to a 10M B limit

(U//FOUQ)

Note: (U//FOUO) In this Read Me, we will not address the Promoter.

3. (U//FOUO) In the signal_acquisition.config, type/edit the following configurations for the

processes identified in step 2:

a. packet splatter,-p 23000 --casenotation source in channel sri
--stats topic ps stats -v -n 4
,isCritical=True,asRoot=True

-1 22000 -t sotf

b. xks xfip, -f

{SEQ ($XSCORE DIR/config/misc/xfip auto inc#.cf)},count=4

CONFIDENTIAL

3 |


===== deepdive-readme page 4 =====
CONFIDENTIAL

c. Mettle temalloc, -f
%{SEQ(SXSCORE DIR/config/misc/mettle#.cf)}, count=4

d. xks defrag,-i %{PORT IN INC (24000) } -o 5040, count=4

4A, (U//FOUO) Type :wq! andthen press Enter to save and exit signal_acquisition.config.

5. (U//FOUO) Perform the following commands only after making changes to both

signal_acquisition.config and xks.config:

6. (U//FOUO) At the command prompt, type xks setup processes and then press Enter.

This will create signal_acquisition_base on each host in the cluster.

7. (U//FOUO) At the command prompt, type xks proc start and then press Enter. This will
start the newly created processes.

(U//FOUO) Configuring DEEPDIVE for FORNSAT

(U//FOUO) Use these configurations if your front-end system is a TURNWEALTHY and outputting

packets, packet bundles, and sessions to an XKS DEEPDIVE. If this is the case, then follow these steps to
configure DEEPDIVE for FORNSAT:

1. (U) Logon as the user oper.

2. (U//FOUO) At the command line from within any directory, type vi config and then press
Enter. The xks.config file will open.

3. (U//FOUOQ) In the #/signal acquisition] section of xks.config, set the following configurations:

a. signal acquisition enable = yes : Bysetting this optionto yes,
signal acquisition processes and associated configurations will be added to
proc resources.

b. signal acquisition on master = no : This willnotcreatea
signal acquisition base onthe Master.

c. have promoter = false : Thisindicates no promoter is configured for the system.

d. signal acquisition[%:ibase] =
casenotation=dynamic, config=generic packet to bundle.config

4 |

CONFIDENTIAL

===== deepdive-readme page 5 =====
CONFIDENTIAL

(U/FOUQ) In the case, the comma separates two options:

e [%:base] = casenotation=dynamic : This configures the multiple
signal acquisition base process on all the hosts in the cluster (%).

e Config = generic packet to bundle.config : Thissetsthe

configuration file to
SXSCORE_DIR/config/signal_acquisition/generic_packet_to_bundle.config

Important: (U/FOUO) If it does not already exist, you must create and configure
generic packet to bundle.config.See below, Configuring
generic_packet_bundle.config, for configuration insructions.

4, (U//FOUO) Type :wq! andthen press Enter to save and exit xks. config.

Configuring generic_packet_bundle.config

Configuring DEEPDIVE for FORNSAT also requires that you setup the generic_packet_bundle.config file:

1. (U//FOUO) At the command line from within any directory, type sa—config and then press
Enter. This will take you to SXSCORE/config/signal_acquisition.

2. (U//FOUO) Open generic_packet_bundle.config, or create a file by that name if it does not
already exist.

3. (U//FOUOQ) In the generic_packet_bundle.config, type/edit the following configurations for the
processes identified in step 2:

a. sotft mux 2,-1 5038 -o 34000 -s 5010,1isCritical=-True

b. xks xfip, -f£
6 {SEQ (SXSCORE DIR/config/misc/xfip generic packet to bundle au
to inc#.cf)},1isCritical=True

c. Mettle temalloc,-f
6 {SEQ (SXSCORE DIR/config/misc/mettle generic packet to bundle

auto inc#.cf)},isCritical=True

d. xks defrag 2,-1 5039 -o 5040,isCritical=True

A, (U//FOUO) Type :wq! andthen press Enter to save and exit generic_packet_bundle.config.

5 |

CONFIDENTIAL

===== deepdive-readme page 6 =====
CONFIDENTIAL

(U) Additional Processes

(U//FOUO) Run these additional processes only after making changes to the configurations in
xks.config,:

1. (U//FOUO) At the command prompt, type xks rsync push config and press Enter.

This sets pushes configuration changes out to the slaves.

2. (U//FOUO) At the command prompt, type xks setup processes and press Enter. This

creates the signal acquisition base process.

3. (U//FOUO) At the command prompt, type xks proc start andpress Enter. This will
ensure all of the running processes pick up any configuration changes.

6 |

CONFIDENTIAL
