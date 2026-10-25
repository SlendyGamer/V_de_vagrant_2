#!/bin/bash
# Script para ser salvo na aplicação (aba Scripts) e executado em um ambiente.
# Mostra isolamento (namespaces) e limites (cgroups); no fim vira um serviço que não termina.
# Sugestão de limites para o teste: CPU 20%, memória 128 MB, IO 5 MB/s.

CG=/sys/fs/cgroup$(cut -d: -f3 /proc/self/cgroup)

echo "=== NAMESPACES ==="
echo "PID deste script: $$ (esperado: 1)"
echo "Hostname: $(hostname) (esperado: env-<id>)"
echo "Processos visíveis: $(ls /proc | grep -c '^[0-9]')"

echo
echo "=== LIMITES (cgroup) ==="
echo "cpu.max:    $(cat $CG/cpu.max)"
echo "memory.max: $(cat $CG/memory.max)"
echo "io.max:     $(cat $CG/io.max 2>/dev/null)"

echo
echo "=== CPU: 5s de loop ocupado ==="
timeout 5 bash -c 'while :; do :; done'
grep -E 'usage_usec|nr_throttled' $CG/cpu.stat

echo
echo "=== IO: gravando 50 MB ==="
dd if=/dev/zero of=/tmp/io-test.bin bs=1M count=50 oflag=direct 2>&1 | tail -1
rm -f /tmp/io-test.bin

echo
echo "=== MEMÓRIA: alocando de 32 em 32 MB até 512 MB ==="
python3 -c "
import time
blocos = []
for i in range(1, 17):
    blocos.append(b'x' * (32 * 1024 * 1024))
    print(f'alocado {i * 32} MB', flush=True)
    time.sleep(0.3)
" || echo "processo encerrado pelo limite de memória (esperado se o limite < 512 MB)"

echo
echo "=== SERVIÇO: heartbeat a cada 2s (use Parar para encerrar) ==="
while true; do
    echo "$(date +%T) vivo"
    sleep 2
done
