# 4 VMs: frontend (Apache + build do Vite, porta 8080 no host), backend (Express),
# db (MySQL) e runner (agent que cria os ambientes com cgroups + namespaces).
# O provision clona o repositório do fork via HTTPS, então mudanças só chegam
# às VMs depois do push. A VM runner usa jammy (cgroup v2 por padrão).
Vagrant.configure("2") do |config|
  is_arm = RUBY_PLATFORM.include?("arm64") || RUBY_PLATFORM.include?("aarch64")
  box_name = is_arm ? "bento/ubuntu-22.04" : "ubuntu/focal64"

  config.vm.boot_timeout = 600

  config.vm.provider "virtualbox" do |vb|
    vb.gui = false
    vb.memory = "2048"
    vb.cpus = 1
    
    vb.customize ["modifyvm", :id, "--natdnshostresolver1", "on"]
    vb.customize ["modifyvm", :id, "--nested-hw-virt", "off"]
  end

  config.vm.define "frontend" do |frontend|
    frontend.vm.box = box_name
    frontend.vm.box_architecture = "arm64" if is_arm
    frontend.vm.hostname = "frontend"

    frontend.vm.network "forwarded_port", guest: 80, host: 8080, auto_correct: true
    frontend.vm.network "private_network", ip: "10.1.1.10", virtualbox__intnet: "front_back"

    # frontend.vm.synced_folder "../shared/frontend", "/home/vagrant/frontend", type: "virtualbox"

    frontend.vm.provision "shell", inline: <<-SHELL
      set -e
      
      MARKER=/etc/vagrant_provisioned

      if [ ! -f "$MARKER" ]; then
        sudo apt-get update
        sudo apt-get install -y curl net-tools git

        git clone --no-checkout https://github.com/SlendyGamer/V_de_vagrant_2.git /home/vagrant/work
        cd /home/vagrant/work
        git sparse-checkout set frontend
        git checkout
      else
        echo "Já provisionado anteriormente, pulando clone/setup inicial."
        cd /home/vagrant/work
        git pull
      fi

      export DEBIAN_FRONTEND=noninteractive

      if ! command -v node &> /dev/null; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs build-essential
      fi

      cd /home/vagrant/work/frontend
      npm install
      npm run build
      sudo chown -R vagrant:vagrant /home/vagrant/work/frontend

      sudo apt-get install -y apache2
      sudo a2enmod proxy proxy_http rewrite

      sudo systemctl disable --now frontend 2>/dev/null || true
      sudo rm -f /etc/systemd/system/frontend.service

      sudo rm -rf /var/www/html/*
      sudo cp -r /home/vagrant/work/frontend/dist/. /var/www/html/

      cat <<'EOF' | sudo tee /etc/apache2/sites-available/000-default.conf
<VirtualHost *:80>
    DocumentRoot /var/www/html

    ProxyPreserveHost On
    ProxyPass /api http://10.1.1.2:3000/api
    ProxyPassReverse /api http://10.1.1.2:3000/api

    <Directory /var/www/html>
        Require all granted
        FallbackResource /index.html
    </Directory>
</VirtualHost>
EOF

      sudo systemctl enable apache2
      sudo systemctl restart apache2
      sudo touch "$MARKER"
    SHELL
  end

  config.vm.define "backend" do |backend|
    backend.vm.box = box_name
    backend.vm.box_architecture = "arm64" if is_arm
    backend.vm.hostname = "backend"

    backend.vm.network "forwarded_port", guest: 3000, host: 3000, auto_correct: true
    backend.vm.network "private_network", ip: "10.1.1.2", virtualbox__intnet: "front_back"
    backend.vm.network "private_network", ip: "10.1.2.10", virtualbox__intnet: "back_db"
    backend.vm.network "private_network", ip: "10.1.3.10", virtualbox__intnet: "back_runner"

    backend.vm.provision "file", source: ".env", destination: "/tmp/backend.env"
    # backend.vm.synced_folder "../shared/backend", "/home/vagrant/backend", type: "virtualbox"

    backend.vm.provision "shell", inline: <<-SHELL
      set -e

      MARKER=/etc/vagrant_provisioned

      if [ ! -f "$MARKER" ]; then
        sudo apt-get update
        sudo apt-get install -y curl net-tools git

        git clone --no-checkout https://github.com/SlendyGamer/V_de_vagrant_2.git /home/vagrant/work
        cd /home/vagrant/work
        git sparse-checkout set backend
        git checkout
      else
        echo "Já provisionado anteriormente, pulando clone/setup inicial."
        cd /home/vagrant/work
        git pull
      fi

      export DEBIAN_FRONTEND=noninteractive

      if ! command -v node &> /dev/null; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs build-essential
      fi

      cd /home/vagrant/work/backend
      npm install
      sudo chown -R vagrant:vagrant /home/vagrant/work/backend
      cp /tmp/backend.env /home/vagrant/work/backend/.env
      sudo chown vagrant:vagrant /home/vagrant/work/backend/.env

      cat <<'EOF' | sudo tee /etc/systemd/system/backend.service
[Unit]
Description=Node.js Backend
After=network.target

[Service]
User=vagrant
WorkingDirectory=/home/vagrant/work/backend
Environment=PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
Environment=NODE_ENV=development
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

      sudo systemctl daemon-reload
      sudo systemctl enable backend
      sudo systemctl restart backend
      sudo touch "$MARKER"
    SHELL
  end

  config.vm.define "db" do |db|
    db.vm.box = box_name
    db.vm.box_architecture = "arm64" if is_arm
    db.vm.hostname = "db"

    db.vm.network "private_network", ip: "10.1.2.2", virtualbox__intnet: "back_db"
    # db.vm.synced_folder "../shared/db", "/home/vagrant/db"

    db.vm.provision "shell", inline: <<-SHELL
      set -e

      MARKER=/etc/vagrant_provisioned

      if [ ! -f "$MARKER" ]; then
        sudo apt-get update
        sudo apt-get install -y curl net-tools git

        git clone --no-checkout https://github.com/SlendyGamer/V_de_vagrant_2.git /home/vagrant/work
        cd /home/vagrant/work
        git sparse-checkout set db
        git checkout
      else
        echo "Já provisionado anteriormente, pulando clone/setup inicial."
        cd /home/vagrant/work
        git pull
      fi

      export DEBIAN_FRONTEND=noninteractive

      if ! command -v mysql &> /dev/null; then
        sudo apt-get update
        sudo apt-get install -y mysql-server
      fi

      sudo systemctl enable mysql
      sudo systemctl start mysql

      sudo sed -i 's/^bind-address.*/bind-address = 0.0.0.0/' /etc/mysql/mysql.conf.d/mysqld.cnf
      sudo systemctl restart mysql

      if [ -f /home/vagrant/work/db/schema.sql ]; then
        sudo mysql < /home/vagrant/work/db/schema.sql
      fi
      sudo touch "$MARKER"
    SHELL
  end

  config.vm.define "runner" do |runner|
    # cgroup v2 é o padrão a partir do Ubuntu 22.04 (jammy)
    runner.vm.box = is_arm ? "bento/ubuntu-22.04" : "ubuntu/jammy64"
    runner.vm.provider "virtualbox" do |vb|
      vb.memory = "4096"
      vb.cpus = 1
    end
    runner.vm.box_architecture = "arm64" if is_arm
    runner.vm.hostname = "runner"

    runner.vm.network "private_network", ip: "10.1.3.20", virtualbox__intnet: "back_runner"

    runner.vm.provision "file", source: ".env", destination: "/tmp/runner.env"

    runner.vm.provision "shell", inline: <<-SHELL
      set -e

      MARKER=/etc/vagrant_provisioned
      export DEBIAN_FRONTEND=noninteractive

      if [ ! -f "$MARKER" ]; then
        sudo apt-get update
        sudo apt-get install -y curl net-tools git util-linux python3

        git clone --no-checkout https://github.com/SlendyGamer/V_de_vagrant_2.git /home/vagrant/work
        cd /home/vagrant/work
        git sparse-checkout set runner
        git checkout
      else
        echo "Já provisionado anteriormente, pulando clone/setup inicial."
        cd /home/vagrant/work
        git pull
      fi

      if ! command -v node &> /dev/null; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs
      fi

      sudo mkdir -p /srv/runner/scripts /srv/runner/logs

      {
        grep '^RUNNER_TOKEN=' /tmp/runner.env
        echo "BIND=10.1.3.20"
        echo "PORT=4000"
      } | sudo tee /etc/runner-agent.env > /dev/null
      sudo chmod 600 /etc/runner-agent.env

      cat <<'EOF' | sudo tee /etc/systemd/system/runner-agent.service
[Unit]
Description=Runner agent (namespaces + cgroups v2)
After=network.target

[Service]
User=root
WorkingDirectory=/home/vagrant/work/runner
EnvironmentFile=/etc/runner-agent.env
ExecStart=/usr/bin/node /home/vagrant/work/runner/agent.js
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

      sudo systemctl daemon-reload
      sudo systemctl enable runner-agent
      sudo systemctl restart runner-agent
      sudo touch "$MARKER"
    SHELL
  end
end

  