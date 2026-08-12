window.FULL_LESSONS = window.FULL_LESSONS || {};
window.FULL_LESSONS["day-08-kubernetes"] = {
  "day": 8,
  "title": "Kubernetes",
  "subtitle": "Desired-state orchestration for containers, services, rollout, scaling, and health.",
  "tags": [
    "Kubernetes",
    "Pods",
    "Deployments",
    "Services",
    "Probes",
    "Autoscaling"
  ],
  "core": "Docker solved how to package one application . Kubernetes solves how to run thousands of containers across hundreds of machines while handling failures, scaling, deployments, networking, and resource management automatically.",
  "sections": [
    {
      "title": "Overview",
      "diagram": "flowchart TD\n  Desired[Declared desired state] --> API[API Server]\n  API --> etcd[(etcd)]\n  API --> Controllers[Controllers]\n  Controllers --> Scheduler[Scheduler]\n  Scheduler --> N1[Node 1 / Pods]\n  Scheduler --> N2[Node 2 / Pods]\n  N1 -. observed state .-> API\n  N2 -. observed state .-> API",
      "body": "<p>Think of the progression:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Docker\n↓\n\"I can package my application.\"\n\nDocker Compose\n↓\n\"I can run a few containers together.\"\n\nKubernetes\n↓\n\"I can run an entire production platform.\"\n</code></pre></div>\n<p>Kubernetes (often abbreviated <strong>K8s</strong>) is less about containers and more about <strong>distributed systems orchestration</strong>.</p>"
    },
    {
      "title": "1. The Problem Kubernetes Solves",
      "diagram": null,
      "body": "<p>Suppose your application consists of:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Frontend\nUser Service\nPayment Service\nNotification Service\nRedis\nPostgreSQL\nKafka\n</code></pre></div>\n<p>Initially you have:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>2 EC2 instances\n</code></pre></div>\n<p>Life is easy.</p>\n<p>Then traffic grows.</p>\n<p>Now you have:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>150 containers\n40 EC2 instances\n</code></pre></div>\n<p>Questions start appearing:</p>\n<ul>\n<li>Which server should run a new container?</li>\n<li>What if a machine dies?</li>\n<li>How do you update only 10% of containers?</li>\n<li>How do containers find each other?</li>\n<li>How do you autoscale?</li>\n<li>How do you restart crashed applications?</li>\n<li>How do you distribute CPU fairly?</li>\n</ul>\n<p>Managing this manually becomes impossible.</p>\n<p>Kubernetes automates it.</p>"
    },
    {
      "title": "2. Kubernetes Philosophy",
      "diagram": null,
      "body": "<p>One of the most important ideas in Kubernetes is:</p>\n<div class=\"callout\">\n<p><strong>You do not tell Kubernetes how to perform operations. You declare the desired state. Kubernetes continuously works to make reality match that desired state.</strong></p>\n</div>\n<p>Example:</p>\n<p>Instead of saying:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Start container A\n\nStart container B\n\nRestart A if it crashes\n</code></pre></div>\n<p>You declare:</p>\n<div class=\"code-block\"><span class=\"code-label\">yaml</span><pre><code>replicas: 3\n</code></pre></div>\n<p>Kubernetes constantly ensures:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Desired = 3\n\nActual = ?\n\n↓\n\nIf Actual &lt; 3\n\n↓\n\nCreate more Pods\n</code></pre></div>\n<p>This is called a <strong>control loop</strong>.</p>"
    },
    {
      "title": "3. Cluster Architecture",
      "diagram": null,
      "body": "<p>A Kubernetes cluster looks like:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>             Control Plane\n\n         API Server\n         Scheduler\n         Controller Manager\n         etcd\n\n               |\n\n-------------------------------------\n\nNode 1     Node 2      Node 3\n\nPods       Pods        Pods\n</code></pre></div>\n<p>Everything revolves around the <strong>API Server</strong>.</p>"
    },
    {
      "title": "4. The API Server",
      "diagram": null,
      "body": "<p>Think of the API Server as:</p>\n<div class=\"callout\">\n<p>The operating system kernel of Kubernetes.</p>\n</div>\n<p>Everything communicates through it.</p>\n<p>When you run:</p>\n<div class=\"code-block\"><span class=\"code-label\">bash</span><pre><code>kubectl apply -f deployment.yaml\n</code></pre></div>\n<p>You are talking to the API Server.</p>\n<p>The API Server:</p>\n<ul>\n<li>validates requests</li>\n<li>stores desired state</li>\n<li>notifies controllers</li>\n</ul>"
    },
    {
      "title": "5. etcd",
      "diagram": null,
      "body": "<p>etcd is Kubernetes' database.</p>\n<p>It stores:</p>\n<ul>\n<li>deployments</li>\n<li>pods</li>\n<li>services</li>\n<li>secrets</li>\n<li>configmaps</li>\n<li>node information</li>\n</ul>\n<p>Without etcd:</p>\n<p>Cluster state disappears.</p>\n<p>Important:</p>\n<p>Application data <strong>does not</strong> live in etcd.</p>\n<p>Only cluster metadata.</p>"
    },
    {
      "title": "6. Worker Nodes",
      "diagram": null,
      "body": "<p>Each node contains:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Operating System\n\n↓\n\nContainer Runtime\n\n↓\n\nKubelet\n\n↓\n\nPods\n</code></pre></div>\n<p>The node simply executes workloads assigned to it.</p>"
    },
    {
      "title": "7. Kubelet",
      "diagram": null,
      "body": "<p>Each node runs one kubelet.</p>\n<p>Responsibilities:</p>\n<ul>\n<li>create Pods</li>\n<li>restart containers</li>\n<li>execute probes</li>\n<li>report health</li>\n<li>talk to API Server</li>\n</ul>\n<p>Think:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>API Server\n\n↓\n\nKubelet\n\n↓\n\nContainers\n</code></pre></div>"
    },
    {
      "title": "8. Pod — The Most Important Concept",
      "diagram": null,
      "body": "<p>Beginners often think:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Docker Container == Kubernetes Container\n</code></pre></div>\n<p>Wrong.</p>\n<p>The smallest deployable unit is:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Pod\n</code></pre></div>\n<p>A Pod contains:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>One\n\nor\n\nMultiple containers\n</code></pre></div>\n<p>Usually:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>One Pod\n\n↓\n\nOne application container\n</code></pre></div>\n<p>But multiple containers are possible.</p>"
    },
    {
      "title": "9. Why Pods?",
      "diagram": null,
      "body": "<p>Suppose application needs:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Spring Boot\n\n↓\n\nLog Collector\n</code></pre></div>\n<p>Both always run together.</p>\n<p>Same:</p>\n<ul>\n<li>IP</li>\n<li>network namespace</li>\n<li>storage</li>\n<li>lifecycle</li>\n</ul>\n<p>Place them inside one Pod.</p>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Pod\n\n↓\n\nSpring Boot\n\n↓\n\nFluent Bit\n</code></pre></div>"
    },
    {
      "title": "10. Pod Networking",
      "diagram": null,
      "body": "<p>Every Pod gets:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Its own IP\n</code></pre></div>\n<p>Unlike Docker bridge networking.</p>\n<p>Communication:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Pod A\n\n↓\n\nPod B\n\nDirect IP\n</code></pre></div>\n<p>No NAT between Pods.</p>\n<p>This greatly simplifies service communication.</p>"
    },
    {
      "title": "11. Pods Are Disposable",
      "diagram": null,
      "body": "<p>This surprises many engineers.</p>\n<p>Never think:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>My Pod\n</code></pre></div>\n<p>Think:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>A temporary execution unit.\n</code></pre></div>\n<p>If Pod dies:</p>\n<p>Kubernetes creates another.</p>\n<p>Not necessarily:</p>\n<ul>\n<li>same IP</li>\n<li>same node</li>\n<li>same filesystem</li>\n</ul>\n<p>Applications must tolerate this.</p>"
    },
    {
      "title": "12. Deployments",
      "diagram": null,
      "body": "<p>You rarely create Pods directly.</p>\n<p>Instead:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Deployment\n\n↓\n\nReplicaSet\n\n↓\n\nPods\n</code></pre></div>\n<p>Deployment declares:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Run\n\n5\n\ncopies\n</code></pre></div>\n<p>ReplicaSet maintains:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Exactly 5 Pods\n</code></pre></div>\n\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">yaml</span><pre><code>replicas: 5\n</code></pre></div>\n<p>Reality:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>5 Pods running\n</code></pre></div>\n<p>Pod crashes:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>4 Pods\n\n↓\n\nReplicaSet notices\n\n↓\n\nCreates new Pod\n\n↓\n\n5 Pods\n</code></pre></div>\n<p>Automatic healing.</p>"
    },
    {
      "title": "13. ReplicaSets",
      "diagram": null,
      "body": "<p>ReplicaSet is responsible only for:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Desired replicas\n\n↓\n\nActual replicas\n</code></pre></div>\n<p>Deployments use ReplicaSets internally.</p>\n<p>Most engineers interact with Deployments instead.</p>"
    },
    {
      "title": "14. Services",
      "diagram": null,
      "body": "<p>Pods have changing IPs.</p>\n<p>Suppose:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Payment Pod\n\n↓\n\n10.1.5.12\n</code></pre></div>\n<p>Pod recreated:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>10.1.7.33\n</code></pre></div>\n<p>Clients break.</p>\n<p>Service solves this.</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>User Service\n\n↓\n\npayment-service\n\n↓\n\nCurrent Payment Pods\n</code></pre></div>\n<p>Clients call:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>payment-service\n</code></pre></div>\n<p>Never Pod IP.</p>"
    },
    {
      "title": "15. Service Types",
      "diagram": null,
      "body": "<h4>ClusterIP</h4>\n<p>Internal only.</p>\n<p>Default.</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Pod\n\n↓\n\nService\n\n↓\n\nPod\n</code></pre></div>\n\n<h4>NodePort</h4>\n<p>Expose on every node.</p>\n<p>Mostly educational or small deployments.</p>\n\n<h4>LoadBalancer</h4>\n<p>Cloud provider provisions:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>AWS Load Balancer\n\n↓\n\nService\n\n↓\n\nPods\n</code></pre></div>\n<p>Most common.</p>\n\n<h4>ExternalName</h4>\n<p>Maps service to external DNS.</p>\n<p>Useful for external dependencies.</p>"
    },
    {
      "title": "16. Ingress",
      "diagram": null,
      "body": "<p>Suppose:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>api.example.com\n\nadmin.example.com\n\nfiles.example.com\n</code></pre></div>\n<p>Without Ingress:</p>\n<p>Need multiple load balancers.</p>\n<p>Ingress:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Internet\n\n↓\n\nIngress Controller\n\n↓\n\nRoute\n\n↓\n\nServices\n</code></pre></div>\n<p>Very similar to reverse proxy.</p>"
    },
    {
      "title": "17. ConfigMaps",
      "diagram": null,
      "body": "<p>Never bake configuration into images.</p>\n<p>Instead:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>ConfigMap\n\n↓\n\nEnvironment Variable\n\n↓\n\nApplication\n</code></pre></div>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">yaml</span><pre><code>SPRING_PROFILE=prod\n</code></pre></div>\n<p>Update configuration.</p>\n<p>Restart Pods.</p>\n<p>Image remains unchanged.</p>"
    },
    {
      "title": "18. Secrets",
      "diagram": null,
      "body": "<p>Like ConfigMaps.</p>\n<p>But intended for sensitive values.</p>\n<p>Examples:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Database password\n\nJWT secret\n\nTLS certificate\n</code></pre></div>\n<p>Important caveat:</p>\n<p>By default, Kubernetes Secrets are <strong>Base64 encoded, not encrypted</strong>. Production clusters should enable encryption at rest and enforce strict access controls.</p>"
    },
    {
      "title": "19. Resource Requests and Limits",
      "diagram": null,
      "body": "<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">yaml</span><pre><code>requests:\n    cpu: 500m\n    memory: 512Mi\n\nlimits:\n    cpu: 2\n    memory: 2Gi\n</code></pre></div>\n<p>Requests:</p>\n<p>Minimum guaranteed.</p>\n<p>Limits:</p>\n<p>Maximum allowed.</p>\n<p>Without limits:</p>\n<p>One container can consume entire node.</p>"
    },
    {
      "title": "20. Scheduler",
      "diagram": null,
      "body": "<p>Scheduler decides:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Which node?\n</code></pre></div>\n<p>Based on:</p>\n<ul>\n<li>available CPU</li>\n<li>available memory</li>\n<li>affinity rules</li>\n<li>taints</li>\n<li>tolerations</li>\n<li>topology constraints</li>\n</ul>\n<p>It does <strong>not</strong> start containers.</p>\n<p>Kubelet does.</p>"
    },
    {
      "title": "21. Liveness Probe",
      "diagram": null,
      "body": "<p>Question:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Should this container be restarted?\n</code></pre></div>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Deadlock\n\n↓\n\nApplication still running\n\n↓\n\nProbe fails\n\n↓\n\nRestart\n</code></pre></div>"
    },
    {
      "title": "22. Readiness Probe",
      "diagram": null,
      "body": "<p>Question:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Can this Pod receive traffic?\n</code></pre></div>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Spring Boot starting\n\n↓\n\nReadiness = false\n\n↓\n\nNo traffic\n\n↓\n\nStartup complete\n\n↓\n\nReadiness = true\n</code></pre></div>\n<p>Crucial during deployments.</p>"
    },
    {
      "title": "23. Startup Probe",
      "diagram": null,
      "body": "<p>Useful for slow applications.</p>\n<p>Without it:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Spring Boot\n\n↓\n\nNeeds 90 seconds\n\n↓\n\nLiveness fails\n\n↓\n\nRestart\n\n↓\n\nInfinite loop\n</code></pre></div>\n<p>Startup probe delays liveness evaluation until initialization finishes.</p>"
    },
    {
      "title": "24. Rolling Updates",
      "diagram": null,
      "body": "<p>Deployment:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Version 1\n\n↓\n\n5 Pods\n</code></pre></div>\n<p>Deploy Version 2.</p>\n<p>Kubernetes:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>New\n\nOld Old Old Old\n\n↓\n\nNew New Old Old Old\n\n↓\n\n...\n\n↓\n\nAll New\n</code></pre></div>\n<p>No downtime.</p>\n<p>Configurable:</p>\n<div class=\"code-block\"><span class=\"code-label\">yaml</span><pre><code>maxUnavailable\n\nmaxSurge\n</code></pre></div>"
    },
    {
      "title": "25. Self-Healing",
      "diagram": null,
      "body": "<p>Node crashes.</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Pods disappear\n</code></pre></div>\n<p>Controller notices.</p>\n<p>Scheduler places replacements on healthy nodes.</p>\n<p>Desired state restored automatically.</p>"
    },
    {
      "title": "26. Horizontal Pod Autoscaler (HPA)",
      "diagram": null,
      "body": "<p>Suppose:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>CPU\n\n80%\n</code></pre></div>\n<p>Policy:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Target\n\n50%\n</code></pre></div>\n<p>HPA:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Current Pods\n\n5\n\n↓\n\nScale\n\n↓\n\n8 Pods\n</code></pre></div>\n<p>Automatic scaling.</p>"
    },
    {
      "title": "27. Vertical Pod Autoscaler",
      "diagram": null,
      "body": "<p>Instead of:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>More Pods\n</code></pre></div>\n<p>Increase:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Memory\n\nCPU\n</code></pre></div>\n<p>Less common.</p>\n<p>May require Pod restart.</p>"
    },
    {
      "title": "28. Namespaces",
      "diagram": null,
      "body": "<p>Logical separation.</p>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>default\n\nproduction\n\nstaging\n\ndevelopment\n</code></pre></div>\n<p>Same cluster.</p>\n<p>Different environments.</p>"
    },
    {
      "title": "29. Labels",
      "diagram": null,
      "body": "<p>Labels identify resources.</p>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">yaml</span><pre><code>app=payment\n\nversion=v2\n\nteam=payments\n</code></pre></div>\n<p>Services select Pods using labels.</p>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>app=payment\n\n↓\n\nAll payment Pods\n</code></pre></div>\n<p>Labels are one of Kubernetes' most powerful abstractions.</p>"
    },
    {
      "title": "30. Taints and Tolerations",
      "diagram": null,
      "body": "<p>Suppose:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>GPU Node\n</code></pre></div>\n<p>Only ML workloads should run there.</p>\n<p>Taint:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>NoSchedule\n</code></pre></div>\n<p>Only Pods with matching toleration may use it.</p>"
    },
    {
      "title": "31. Affinity",
      "diagram": null,
      "body": "<p>Example:</p>\n<p>Keep services together.</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Payment\n\n↓\n\nRedis\n\n↓\n\nSame zone\n</code></pre></div>\n<p>Or apart.</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Replica A\n\n↓\n\nZone 1\n\nReplica B\n\n↓\n\nZone 2\n</code></pre></div>\n<p>Improves resilience.</p>"
    },
    {
      "title": "32. Persistent Volumes",
      "diagram": null,
      "body": "<p>Pods are ephemeral.</p>\n<p>Need persistent storage.</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Pod\n\n↓\n\nPersistent Volume Claim\n\n↓\n\nPersistent Volume\n\n↓\n\nAWS EBS\n</code></pre></div>\n<p>Pod replaced.</p>\n<p>Storage remains.</p>"
    },
    {
      "title": "33. StatefulSets",
      "diagram": null,
      "body": "<p>Deployments are for stateless services.</p>\n<p>Stateful systems like:</p>\n<ul>\n<li>PostgreSQL</li>\n<li>Kafka</li>\n<li>ZooKeeper</li>\n</ul>\n<p>need stable:</p>\n<ul>\n<li>identity</li>\n<li>storage</li>\n<li>ordering</li>\n</ul>\n<p>Use StatefulSets.</p>"
    },
    {
      "title": "34. DaemonSets",
      "diagram": null,
      "body": "<p>Need one Pod per node?</p>\n<p>Examples:</p>\n<ul>\n<li>log collector</li>\n<li>monitoring agent</li>\n<li>security scanner</li>\n</ul>\n<p>Use DaemonSet.</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Node1\n\n↓\n\nFluent Bit\n</code></pre></div>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Node2\n\n↓\n\nFluent Bit\n</code></pre></div>\n<p>Automatically.</p>"
    },
    {
      "title": "35. Common Production Mistakes",
      "diagram": null,
      "body": "<h5>❌ Treating Pods like VMs</h5>\n<p>SSHing into Pods.</p>\n<p>Editing files.</p>\n<p>Changes disappear.</p>\n\n<h5>❌ No resource limits</h5>\n<p>Noisy neighbor problem.</p>\n\n<h5>❌ Storing uploads inside Pods</h5>\n<p>Pods die.</p>\n<p>Data disappears.</p>\n\n<h5>❌ Using Pod IPs</h5>\n<p>Pods are temporary.</p>\n<p>Always use Services.</p>\n\n<h5>❌ One giant namespace</h5>\n<p>Hard to manage.</p>\n\n<h5>❌ Liveness checking the database</h5>\n<p>If DB is temporarily unavailable, restarting every Pod often makes recovery worse. Liveness should generally answer \"is this process recoverably broken?\" rather than \"is every dependency healthy?\"</p>"
    },
    {
      "title": "36. Kubernetes vs Docker",
      "diagram": null,
      "body": "<p>Docker:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>One machine\n\n↓\n\nRun container\n</code></pre></div>\n<p>Kubernetes:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Hundreds of machines\n\n↓\n\nSchedule\n\nScale\n\nHeal\n\nNetwork\n\nDeploy\n\nObserve\n</code></pre></div>\n<p>Docker is still used.</p>\n<p>Kubernetes orchestrates Docker-compatible containers (today typically via runtimes implementing the Container Runtime Interface, such as containerd).</p>"
    },
    {
      "title": "37. Real Production Architecture",
      "diagram": null,
      "body": "<p>A Spring Boot application might look like:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Internet\n\n↓\n\nAWS ALB\n\n↓\n\nIngress Controller\n\n↓\n\npayment-service\n\n↓\n\nDeployment\n\n↓\n\n5 Pods\n\n↓\n\nEach Pod\n\n↓\n\nSpring Boot Container\n\n↓\n\nPersistent Volume Claim (if needed)\n\n↓\n\nAWS EBS\n</code></pre></div>\n<p>Monitoring:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Prometheus\n\n↓\n\nGrafana\n</code></pre></div>\n<p>Logs:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Fluent Bit\n\n↓\n\nCloudWatch\n</code></pre></div>"
    },
    {
      "title": "38. Interview Discussion",
      "diagram": null,
      "body": "<h5>Why Pods instead of containers?</h5>\n<p>Pods provide:</p>\n<ul>\n<li>shared networking</li>\n<li>shared storage</li>\n<li>shared lifecycle</li>\n<li>sidecar support</li>\n</ul>\n<p>They are Kubernetes' scheduling unit.</p>\n\n<h5>Why Services?</h5>\n<p>Pods are ephemeral.</p>\n<p>Services provide stable networking.</p>\n\n<h5>Why Deployments?</h5>\n<p>Automatic:</p>\n<ul>\n<li>scaling</li>\n<li>self-healing</li>\n<li>rolling updates</li>\n</ul>\n\n<h5>Why ConfigMaps?</h5>\n<p>Keep configuration outside images.</p>\n\n<h5>Why resource limits?</h5>\n<p>Prevent one workload from starving others.</p>"
    },
    {
      "title": "39. Practical Exercise",
      "diagram": null,
      "body": "<p>Design a Kubernetes deployment for a payment platform with:</p>\n<ul>\n<li>User Service</li>\n<li>Wallet Service</li>\n<li>Payment Service</li>\n<li>Redis</li>\n<li>PostgreSQL</li>\n<li>Kafka</li>\n<li>Notification Service</li>\n</ul>\n<p>Answer:</p>\n<ol>\n<li>Which components should use Deployments?</li>\n<li>Which should use StatefulSets?</li>\n<li>Which should have Persistent Volumes?</li>\n<li>Which Services should be ClusterIP vs LoadBalancer?</li>\n<li>Where would you use ConfigMaps and Secrets?</li>\n<li>What readiness and liveness probes would you implement for the Spring Boot services?</li>\n<li>Which Pods should autoscale?</li>\n<li>How would you ensure Payment Service Pods are spread across multiple Availability Zones?</li>\n<li>How would you perform a rolling update without interrupting payment processing?</li>\n<li>What would happen if an entire worker node failed?</li>\n</ol>"
    },
    {
      "title": "40. Key Takeaways",
      "diagram": null,
      "body": "<p>Keep these mental models:</p>\n<table>\n<thead>\n<tr>\n<th>Kubernetes Object</th>\n<th>Think of it as...</th>\n</tr>\n</thead>\n<tbody>\n<tr>\n<td>Pod</td>\n<td>Smallest deployable execution unit</td>\n</tr>\n<tr>\n<td>Deployment</td>\n<td>Desired state manager for stateless applications</td>\n</tr>\n<tr>\n<td>ReplicaSet</td>\n<td>Keeps the requested number of Pods running</td>\n</tr>\n<tr>\n<td>Service</td>\n<td>Stable network endpoint for ephemeral Pods</td>\n</tr>\n<tr>\n<td>Ingress</td>\n<td>HTTP/HTTPS entry point and routing layer</td>\n</tr>\n<tr>\n<td>ConfigMap</td>\n<td>Externalized non-sensitive configuration</td>\n</tr>\n<tr>\n<td>Secret</td>\n<td>Sensitive runtime configuration</td>\n</tr>\n<tr>\n<td>Persistent Volume</td>\n<td>Durable storage independent of Pod lifetime</td>\n</tr>\n<tr>\n<td>StatefulSet</td>\n<td>Controller for stateful workloads</td>\n</tr>\n<tr>\n<td>DaemonSet</td>\n<td>One Pod on every (or selected) node</td>\n</tr>\n</tbody>\n</table>\n<p>The single biggest mindset shift is:</p>\n<div class=\"callout\">\n<p><strong>You don't manage servers in Kubernetes—you declare the desired state of your applications. Kubernetes continuously reconciles reality to match that declaration.</strong></p>\n</div>\n<p>Tomorrow's topic is <strong>Service Discovery</strong>, where we'll examine how hundreds of microservices locate one another reliably without hardcoding IP addresses, and how Kubernetes, DNS, service registries, and client-side discovery work together.</p>"
    }
  ],
  "keyTakeaways": [
    "Declare desired state and let controllers reconcile reality.",
    "Treat Pods as disposable and Services as stable discovery endpoints.",
    "Use readiness, liveness, and startup probes for different decisions.",
    "Requests, limits, topology, storage, and rollout settings are part of application correctness.",
    "Avoid operating stateful systems like ordinary stateless Deployments."
  ]
};
