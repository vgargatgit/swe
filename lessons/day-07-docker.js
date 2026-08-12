window.FULL_LESSONS = window.FULL_LESSONS || {};
window.FULL_LESSONS["day-07-docker"] = {
  "day": 7,
  "title": "Docker",
  "subtitle": "Package applications and runtime dependencies into immutable images and disposable containers.",
  "tags": [
    "Docker",
    "Containers",
    "Images",
    "Multi-stage build",
    "Security",
    "JVM"
  ],
  "core": "Docker is not a virtual machine. It is a standardized packaging format for applications. It allows the same application, with the same dependencies, to run consistently on a developer's laptop, a CI server, a staging environment, or a production cluster.",
  "sections": [
    {
      "title": "Overview",
      "diagram": "flowchart TD\n  Dockerfile --> Image[Immutable image layers]\n  Image --> C1[Container 1]\n  Image --> C2[Container 2]\n  C1 --> Kernel[Host kernel]\n  C2 --> Kernel\n  C1 --> External[External config / secrets / storage]",
      "body": "<p>One sentence to remember:</p>\n<div class=\"callout\">\n<p><strong>A container packages the application; the host kernel runs it.</strong></p>\n</div>\n<p>This single idea explains most of Docker's advantages and limitations.</p>"
    },
    {
      "title": "1. Why Docker Exists",
      "diagram": null,
      "body": "<p>Before Docker, deployment often looked like this:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Developer Laptop\nJava 17.0.4\nMaven 3.8\nUbuntu 20.04\n\n↓\n\nTest Server\nJava 17.0.6\nMaven 3.6\nUbuntu 22.04\n\n↓\n\nProduction\nJava 21 (!)\nCentOS\n</code></pre></div>\n<p>Result:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Works on my machine.\n</code></pre></div>\n<p>Docker solves this by packaging everything except the kernel.</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Application\nLibraries\nJDK\nOS user-space\nConfiguration\n\n↓\n\nDocker Image\n\n↓\n\nRuns identically everywhere\n</code></pre></div>"
    },
    {
      "title": "2. Virtual Machines vs Containers",
      "diagram": null,
      "body": "<p>This is one of the most common interview questions.</p>\n<h4>Virtual Machine</h4>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Hardware\n\n↓\n\nHypervisor\n\n↓\n\nVM1\nGuest OS\nApp\n\n↓\n\nVM2\nGuest OS\nApp\n</code></pre></div>\n<p>Each VM has:</p>\n<ul>\n<li>full operating system</li>\n<li>kernel</li>\n<li>drivers</li>\n</ul>\n<p>Heavy but strongly isolated.</p>\n\n<h4>Docker Container</h4>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Hardware\n\n↓\n\nHost Linux Kernel\n\n↓\n\nDocker Engine\n\n↓\n\nContainer A\n\n↓\n\nContainer B\n\n↓\n\nContainer C\n</code></pre></div>\n<p>Containers share:</p>\n<ul>\n<li>Linux kernel</li>\n</ul>\n<p>Each container has:</p>\n<ul>\n<li>filesystem</li>\n<li>processes</li>\n<li>networking</li>\n<li>libraries</li>\n</ul>\n<p>This makes containers much lighter.</p>"
    },
    {
      "title": "3. Why Containers Are Fast",
      "diagram": null,
      "body": "<p>VM startup:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Boot BIOS\n\n↓\n\nBoot kernel\n\n↓\n\nStart OS\n\n↓\n\nStart application\n</code></pre></div>\n<p>Container startup:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Start process\n</code></pre></div>\n<p>That's why containers often start in seconds or less.</p>"
    },
    {
      "title": "4. Docker Architecture",
      "diagram": null,
      "body": "<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Docker CLI\n\n↓\n\nDocker Daemon\n\n↓\n\nImages\n\nContainers\n\nNetworks\n\nVolumes\n</code></pre></div>\n<p>CLI:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>docker run\ndocker build\ndocker ps\n</code></pre></div>\n<p>talks to the Docker daemon.</p>"
    },
    {
      "title": "5. Image vs Container",
      "diagram": null,
      "body": "<p>This distinction is fundamental.</p>\n<h4>Image</h4>\n<p>Think:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Class\n</code></pre></div>\n<p>Immutable blueprint.</p>\n<p>Contains:</p>\n<ul>\n<li>filesystem</li>\n<li>binaries</li>\n<li>libraries</li>\n<li>startup command</li>\n</ul>\n\n<h4>Container</h4>\n<p>Think:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Object\n</code></pre></div>\n<p>Running instance of image.</p>\n<p>One image can produce many containers.</p>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>nginx image\n\n↓\n\nContainer 1\n\n↓\n\nContainer 2\n\n↓\n\nContainer 3\n</code></pre></div>"
    },
    {
      "title": "6. Building an Image",
      "diagram": null,
      "body": "<p>Typical Dockerfile:</p>\n<div class=\"code-block\"><span class=\"code-label\">dockerfile</span><pre><code>FROM eclipse-temurin:17-jre\n\nWORKDIR /app\n\nCOPY app.jar app.jar\n\nENTRYPOINT [\"java\",\"-jar\",\"app.jar\"]\n</code></pre></div>\n<p>Build:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>docker build -t payment-service:1.0 .\n</code></pre></div>\n<p>Now image exists.</p>"
    },
    {
      "title": "7. Running a Container",
      "diagram": null,
      "body": "<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>docker run payment-service:1.0\n</code></pre></div>\n<p>Docker:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Create filesystem\n\n↓\n\nCreate namespaces\n\n↓\n\nApply cgroups\n\n↓\n\nStart java process\n</code></pre></div>\n<p>Notice:</p>\n<p>No operating system boot.</p>"
    },
    {
      "title": "8. Docker Layers",
      "diagram": null,
      "body": "<p>Images consist of layers.</p>\n<p>Dockerfile:</p>\n<div class=\"code-block\"><span class=\"code-label\">dockerfile</span><pre><code>FROM eclipse-temurin:17-jre\n\nCOPY app.jar app.jar\n</code></pre></div>\n<p>Layers:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Base OS\n\n↓\n\nJRE\n\n↓\n\nApplication\n</code></pre></div>\n<p>If only app changes:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Reuse\n\nBase\n\nJRE\n\n↓\n\nReplace\n\nApplication layer\n</code></pre></div>\n<p>Huge performance benefit.</p>"
    },
    {
      "title": "9. Layer Caching",
      "diagram": null,
      "body": "<p>Suppose Dockerfile:</p>\n<div class=\"code-block\"><span class=\"code-label\">dockerfile</span><pre><code>COPY . .\n\nRUN mvn package\n</code></pre></div>\n<p>Every code change invalidates cache.</p>\n<p>Bad.</p>\n<p>Better:</p>\n<div class=\"code-block\"><span class=\"code-label\">dockerfile</span><pre><code>COPY pom.xml .\n\nRUN mvn dependency:go-offline\n\nCOPY src src\n\nRUN mvn package\n</code></pre></div>\n<p>Dependencies stay cached.</p>\n<p>Only source recompiles.</p>\n<p>Large builds become much faster.</p>"
    },
    {
      "title": "10. Build Context",
      "diagram": null,
      "body": "<p>Command:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>docker build .\n</code></pre></div>\n<p>The dot matters.</p>\n<p>Everything under current directory becomes build context.</p>\n<p>Including:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>.git\n\ntarget\n\nlogs\n\nnode_modules\n\n</code></pre></div>\n<p>unless ignored.</p>\n<p>Large contexts:</p>\n<ul>\n<li>slow builds</li>\n<li>unnecessary uploads</li>\n<li>security risks</li>\n</ul>\n<p>Always use:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>.dockerignore\n</code></pre></div>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>target/\n\n.git/\n\n.idea/\n\nlogs/\n</code></pre></div>"
    },
    {
      "title": "11. Multi-Stage Builds",
      "diagram": null,
      "body": "<p>Don't ship Maven.</p>\n<p>Bad:</p>\n<div class=\"code-block\"><span class=\"code-label\">dockerfile</span><pre><code>FROM maven\n\nCOPY .\n\nRUN mvn package\n</code></pre></div>\n<p>Production image now contains:</p>\n<ul>\n<li>Maven</li>\n<li>compiler</li>\n<li>source code</li>\n</ul>\n<p>Huge.</p>\n<p>Better:</p>\n<div class=\"code-block\"><span class=\"code-label\">dockerfile</span><pre><code>FROM maven AS builder\n\nCOPY .\n\nRUN mvn package\n\nFROM eclipse-temurin:17-jre\n\nCOPY --from=builder target/app.jar app.jar\n\nENTRYPOINT [\"java\",\"-jar\",\"app.jar\"]\n</code></pre></div>\n<p>Runtime image contains only:</p>\n<ul>\n<li>JRE</li>\n<li>JAR</li>\n</ul>\n<p>Much smaller.</p>"
    },
    {
      "title": "12. Why Small Images Matter",
      "diagram": null,
      "body": "<p>Smaller images mean:</p>\n<ul>\n<li>faster builds</li>\n<li>faster CI</li>\n<li>faster deployments</li>\n<li>lower registry storage</li>\n<li>quicker autoscaling</li>\n<li>fewer vulnerabilities</li>\n</ul>\n<p>A 120 MB image may start much faster than a 1.5 GB image.</p>"
    },
    {
      "title": "13. The PID 1 Problem",
      "diagram": null,
      "body": "<p>Inside a container:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>PID 1\n\n↓\n\nYour application\n</code></pre></div>\n<p>PID 1 has special responsibilities.</p>\n<p>If Java becomes PID 1:</p>\n<p>Signal handling may be different.</p>\n<p>Zombie processes may accumulate if child processes are spawned and not reaped.</p>\n<p>Solutions:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>tini\n\ndumb-init\n</code></pre></div>\n<p>or modern container-aware JVM usage.</p>\n<p>Many official images already handle this.</p>"
    },
    {
      "title": "14. Container Filesystem",
      "diagram": null,
      "body": "<p>Container filesystem is ephemeral.</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Write file\n\n↓\n\nContainer removed\n\n↓\n\nFile gone\n</code></pre></div>\n<p>Never rely on container filesystem for:</p>\n<ul>\n<li>uploads</li>\n<li>databases</li>\n<li>logs</li>\n<li>persistent configuration</li>\n</ul>\n<p>Use:</p>\n<p>Volumes.</p>"
    },
    {
      "title": "15. Volumes",
      "diagram": null,
      "body": "<p>Instead of:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Container\n\n↓\n\n/data\n</code></pre></div>\n<p>Use:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Host Volume\n\n↓\n\nMounted\n\n↓\n\nContainer\n</code></pre></div>\n<p>Now:</p>\n<p>Container dies.</p>\n<p>Data survives.</p>\n<p>Essential for:</p>\n<ul>\n<li>PostgreSQL</li>\n<li>MySQL</li>\n<li>uploads</li>\n<li>persistent caches</li>\n</ul>"
    },
    {
      "title": "16. Bind Mounts vs Volumes",
      "diagram": null,
      "body": "<p>Bind mount:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Host directory\n\n↓\n\nContainer\n</code></pre></div>\n<p>Useful for development.</p>\n<p>Volume:</p>\n<p>Managed by Docker.</p>\n<p>Better for production.</p>"
    },
    {
      "title": "17. Networking",
      "diagram": null,
      "body": "<p>Every container gets networking.</p>\n<p>Bridge mode:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Container A\n\n↓\n\nDocker Bridge\n\n↓\n\nContainer B\n</code></pre></div>\n<p>Host mode:</p>\n<p>Container shares host networking.</p>\n<p>Overlay:</p>\n<p>Used across multiple hosts (e.g., Docker Swarm).</p>\n<p>Kubernetes uses different networking, which we'll cover later.</p>"
    },
    {
      "title": "18. Exposing Ports",
      "diagram": null,
      "body": "<p>Application:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>8080\n</code></pre></div>\n<p>Expose:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>docker run -p 80:8080\n</code></pre></div>\n<p>Meaning:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Host:80\n\n↓\n\nContainer:8080\n</code></pre></div>"
    },
    {
      "title": "19. Environment Variables",
      "diagram": null,
      "body": "<p>Never hardcode environment-specific values.</p>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">dockerfile</span><pre><code>ENV SPRING_PROFILES_ACTIVE=prod\n</code></pre></div>\n<p>Better:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>docker run\n\n-e SPRING_PROFILES_ACTIVE=prod\n</code></pre></div>\n<p>or inject via orchestration platform.</p>"
    },
    {
      "title": "20. Secrets",
      "diagram": null,
      "body": "<p>Do NOT bake secrets into images.</p>\n<p>Bad:</p>\n<div class=\"code-block\"><span class=\"code-label\">dockerfile</span><pre><code>ENV DB_PASSWORD=password123\n</code></pre></div>\n<p>Image now permanently contains secret.</p>\n<p>Use:</p>\n<ul>\n<li>Docker secrets</li>\n<li>Kubernetes secrets</li>\n<li>AWS Secrets Manager</li>\n<li>Vault</li>\n</ul>\n<p>Retrieve at runtime.</p>"
    },
    {
      "title": "21. Logging",
      "diagram": null,
      "body": "<p>Do not log to files inside containers.</p>\n<p>Bad:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>/logs/app.log\n</code></pre></div>\n<p>Container removed.</p>\n<p>Logs disappear.</p>\n<p>Best practice:</p>\n<p>Write to:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>stdout\n\nstderr\n</code></pre></div>\n<p>Container platform collects logs.</p>\n<p>Spring Boot already works well with this model.</p>"
    },
    {
      "title": "22. Resource Limits",
      "diagram": null,
      "body": "<p>Without limits:</p>\n<p>Container may consume:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>All CPU\n\nAll RAM\n</code></pre></div>\n<p>Examples:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>--memory=512m\n\n--cpus=2\n</code></pre></div>\n<p>Very important in shared environments.</p>"
    },
    {
      "title": "23. JVM Inside Containers",
      "diagram": null,
      "body": "<p>Historically:</p>\n<p>JVM saw:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>64 GB host RAM\n</code></pre></div>\n<p>even when container had:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>512 MB\n</code></pre></div>\n<p>Result:</p>\n<p>OOM.</p>\n<p>Modern JVMs (Java 10+) understand cgroups.</p>\n<p>Still, configure memory deliberately.</p>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>-XX:MaxRAMPercentage=75\n</code></pre></div>\n<p>rather than hardcoded heap sizes in many containerized deployments.</p>"
    },
    {
      "title": "24. Health Checks",
      "diagram": null,
      "body": "<p>Docker supports:</p>\n<div class=\"code-block\"><span class=\"code-label\">dockerfile</span><pre><code>HEALTHCHECK CMD curl http://localhost:8080/actuator/health || exit 1\n</code></pre></div>\n<p>Container becomes:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>healthy\n\nor\n\nunhealthy\n</code></pre></div>\n<p>Orchestrators can act on this.</p>"
    },
    {
      "title": "25. Running as Root",
      "diagram": null,
      "body": "<p>Many images run as root.</p>\n<p>Risk:</p>\n<p>Container compromise becomes more severe.</p>\n<p>Better:</p>\n<div class=\"code-block\"><span class=\"code-label\">dockerfile</span><pre><code>USER appuser\n</code></pre></div>\n<p>Least privilege.</p>"
    },
    {
      "title": "26. Image Security",
      "diagram": null,
      "body": "<p>Scan images for:</p>\n<ul>\n<li>CVEs</li>\n<li>outdated libraries</li>\n<li>vulnerable OS packages</li>\n</ul>\n<p>Tools:</p>\n<ul>\n<li>Trivy</li>\n<li>Grype</li>\n<li>Docker Scout</li>\n</ul>\n<p>Scan should be part of CI.</p>"
    },
    {
      "title": "27. Image Tags",
      "diagram": null,
      "body": "<p>Bad:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>latest\n</code></pre></div>\n<p>Good:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>payment-service:2.4.1\n\npayment-service:20260711\n\npayment-service:git-8fa712c\n</code></pre></div>\n<p>Even better:</p>\n<p>Deploy by immutable digest:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>sha256:...\n</code></pre></div>"
    },
    {
      "title": "28. Container Lifecycle",
      "diagram": null,
      "body": "<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Created\n\n↓\n\nRunning\n\n↓\n\nPaused\n\n↓\n\nStopped\n\n↓\n\nRemoved\n</code></pre></div>\n<p>Remember:</p>\n<p>Stopped ≠ deleted.</p>"
    },
    {
      "title": "29. Common Production Mistakes",
      "diagram": null,
      "body": "<h5>❌ Treating containers like VMs</h5>\n<p>SSH into them.</p>\n<p>Edit files manually.</p>\n<p>Changes disappear after redeployment.</p>\n<p>Containers should be immutable.</p>\n\n<h5>❌ Storing data inside containers</h5>\n<p>Data disappears.</p>\n\n<h5>❌ Huge images</h5>\n<p>2 GB images slow everything.</p>\n\n<h5>❌ Running multiple unrelated services</h5>\n<p>One container should usually have one primary responsibility.</p>\n<p>Example:</p>\n<p>Don't combine:</p>\n<ul>\n<li>MySQL</li>\n<li>Redis</li>\n<li>Spring Boot</li>\n</ul>\n<p>inside one container.</p>\n\n<h5>❌ Using latest</h5>\n<p>Rollbacks become unpredictable.</p>\n\n<h5>❌ Baking secrets into images</h5>\n<p>Very common security mistake.</p>\n\n<h5>❌ Writing logs to local disk</h5>\n<p>Use stdout/stderr.</p>\n\n<h5>❌ Ignoring resource limits</h5>\n<p>Containers compete unpredictably.</p>"
    },
    {
      "title": "30. Dockerfile Best Practices",
      "diagram": null,
      "body": "<p>Good Dockerfile:</p>\n<div class=\"code-block\"><span class=\"code-label\">dockerfile</span><pre><code>FROM eclipse-temurin:17-jre\n\nRUN useradd -m app\n\nUSER app\n\nWORKDIR /app\n\nCOPY app.jar app.jar\n\nENTRYPOINT [\"java\",\"-jar\",\"app.jar\"]\n</code></pre></div>\n<p>Production improvements:</p>\n<ul>\n<li>multi-stage build</li>\n<li>non-root user</li>\n<li>minimal base image</li>\n<li>immutable image</li>\n<li>no secrets</li>\n<li>health check</li>\n<li>version labels</li>\n</ul>"
    },
    {
      "title": "31. Docker Compose",
      "diagram": null,
      "body": "<p>Useful for local development.</p>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>Spring Boot\n\n↓\n\nRedis\n\n↓\n\nPostgreSQL\n</code></pre></div>\n<p>One command:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>docker compose up\n</code></pre></div>\n<p>Entire stack starts.</p>\n<p>Compose is primarily a local development and lightweight deployment tool—not a production orchestrator for large distributed systems.</p>"
    },
    {
      "title": "32. Interview Discussion",
      "diagram": null,
      "body": "<h5>Why Docker instead of VMs?</h5>\n<ul>\n<li>Faster startup</li>\n<li>Better density</li>\n<li>Consistent runtime</li>\n<li>Easier deployment</li>\n<li>Smaller footprint</li>\n</ul>\n\n<h5>Why Multi-Stage Builds?</h5>\n<p>To avoid shipping:</p>\n<ul>\n<li>Maven</li>\n<li>source code</li>\n<li>compiler</li>\n<li>build tools</li>\n</ul>\n<p>Only runtime components remain.</p>\n\n<h5>Why shouldn't containers store state?</h5>\n<p>Containers are designed to be disposable.</p>\n<p>Persistence belongs in external storage.</p>\n\n<h5>Why run as non-root?</h5>\n<p>Limits damage if application is compromised.</p>"
    },
    {
      "title": "33. Real Production Example",
      "diagram": null,
      "body": "<p>Suppose your payment service is deployed on ECS.</p>\n<p>Pipeline:</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>GitHub Actions\n\n↓\n\nBuild Docker image\n\n↓\n\nTrivy scan\n\n↓\n\nPush to Amazon ECR\n\n↓\n\nDeploy ECS\n\n↓\n\nHealth check\n\n↓\n\nALB routes traffic\n\n↓\n\nOld tasks drained\n</code></pre></div>\n<p>Each new deployment creates <strong>new containers</strong>.</p>\n<p>Nobody logs in to patch them.</p>\n<p>If a bug is found:</p>\n<p>Build new image.</p>\n<p>Deploy again.</p>\n<p>Immutable infrastructure.</p>"
    },
    {
      "title": "34. Practical Exercise",
      "diagram": null,
      "body": "<p>Design a production Docker image for a Spring Boot service with:</p>\n<ul>\n<li>Java 21</li>\n<li>Maven build</li>\n<li>Redis</li>\n<li>PostgreSQL</li>\n<li>REST APIs</li>\n<li>Actuator</li>\n<li>Prometheus metrics</li>\n</ul>\n<p>Answer:</p>\n<ol>\n<li>What should the Dockerfile look like?</li>\n<li>Which base image would you choose and why?</li>\n<li>Where would configuration come from?</li>\n<li>How would secrets be injected?</li>\n<li>Which directories should become volumes, if any?</li>\n<li>Which JVM options would you configure for a 1 GB container?</li>\n<li>Which files belong in <code class=\"inline-code\">.dockerignore</code>?</li>\n<li>What would your image-tagging strategy be?</li>\n<li>How would you ensure the image is reproducible and secure?</li>\n<li>Which checks would you add to the CI pipeline before publishing the image?</li>\n</ol>"
    },
    {
      "title": "35. Key Takeaways",
      "diagram": null,
      "body": "<p>Keep these mental models:</p>\n<table>\n<thead>\n<tr>\n<th>Concept</th>\n<th>Mental Model</th>\n</tr>\n</thead>\n<tbody>\n<tr>\n<td>Image</td>\n<td>Immutable blueprint</td>\n</tr>\n<tr>\n<td>Container</td>\n<td>Running instance of an image</td>\n</tr>\n<tr>\n<td>Dockerfile</td>\n<td>Recipe for creating the blueprint</td>\n</tr>\n<tr>\n<td>Volume</td>\n<td>External persistent storage</td>\n</tr>\n<tr>\n<td>Registry</td>\n<td>Package repository for images</td>\n</tr>\n<tr>\n<td>Multi-stage build</td>\n<td>Build with heavy tools, ship only runtime</td>\n</tr>\n<tr>\n<td>Container</td>\n<td>Disposable process, not a virtual machine</td>\n</tr>\n</tbody>\n</table>\n<p>The single most important mindset shift is this:</p>\n<div class=\"callout\">\n<p><strong>Never modify a running container to \"fix\" production.</strong> If something needs to change, change the source or configuration, build a new image, and redeploy. This preserves repeatability, traceability, and confidence in your deployment process.</p>\n</div>\n<p>Tomorrow's topic is <strong>Kubernetes</strong>, where we'll build on Docker and learn how to orchestrate thousands of containers across many machines, including Pods, Deployments, Services, ReplicaSets, rolling updates, and self-healing clusters.</p>"
    }
  ],
  "keyTakeaways": [
    "An image is an immutable blueprint; a container is a disposable running process.",
    "Build with heavy tools, but ship only the minimal runtime.",
    "Keep secrets, durable state, and environment configuration outside the image.",
    "Run with least privilege and explicit CPU/memory limits.",
    "Fix production by building a new image, not by editing a running container."
  ]
};
