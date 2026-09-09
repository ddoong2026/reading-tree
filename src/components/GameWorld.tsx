import React, { useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Instances, Instance, Html, useProgress } from '@react-three/drei';
import { Link, useParams, useNavigate } from 'react-router-dom';
import * as THREE from 'three';

import { TreeModel } from './world3d/TreeModel';
import { CharacterModel } from './world3d/CharacterModel';
import { PlantModel } from './world3d/PlantModel';
import { ItemEffectModel } from './world3d/ItemEffectModel';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';

// 완전한 단색(흰색) 구름 컴포넌트
const SimpleCloud = ({ position, scale = 1 }: { position: [number, number, number], scale?: number }) => (
  <group position={position} scale={scale}>
    <mesh position={[0, 0, 0]}>
      <sphereGeometry args={[3, 16, 16]} />
      <meshBasicMaterial color="white" />
    </mesh>
    <mesh position={[2.5, -0.5, 0]}>
      <sphereGeometry args={[2, 16, 16]} />
      <meshBasicMaterial color="white" />
    </mesh>
    <mesh position={[-2.5, -0.5, 0]}>
      <sphereGeometry args={[2, 16, 16]} />
      <meshBasicMaterial color="white" />
    </mesh>
  </group>
);

// --- 로딩 화면 컴포넌트 ---
const CanvasLoader = () => {
  const { progress } = useProgress();
  return (
    <Html center zIndexRange={[1000, 0]}>
      <div className="flex flex-col items-center justify-center p-8 bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl min-w-[280px]">
        <div className="text-5xl mb-4 animate-bounce">🌳</div>
        <h2 className="text-2xl font-bold text-green-800 mb-4">학급 나무로 이동 중...</h2>
        <div className="w-full bg-green-100 rounded-full h-4 mb-2 overflow-hidden border border-green-200">
          <div 
            className="bg-gradient-to-r from-green-400 to-emerald-500 h-full transition-all duration-300 ease-out" 
            style={{ width: `${Math.max(5, progress)}%` }}
          ></div>
        </div>
        <p className="text-md font-bold text-green-600">{progress.toFixed(0)}% 완료</p>
      </div>
    </Html>
  );
};

const GameWorld: React.FC = () => {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const { profile, loading } = useAuth();
  const [characterTarget, setCharacterTarget] = useState<THREE.Vector3 | null>(null);
  const [controlMode, setControlMode] = useState<'click' | 'keyboard'>('click');

  React.useEffect(() => {
    if (!loading && classId === 'class-3' && profile?.role !== 'admin' && profile?.role !== 'teacher') {
      alert("이 숲은 관리자만 들어갈 수 있습니다.");
      navigate('/map');
    }
  }, [classId, profile, loading, navigate]);
  
  const formatClassId = (cid: string | null | undefined) => {
    if (!cid) return '전체';
    const parts = cid.split('-');
    if (parts.length === 3) {
      return `${parts[0]}학년도 ${parts[1]}학년 ${parts[2]}반`;
    }
    if (cid === 'class-1') return '5학년 1반';
    if (cid === 'class-2') return '5학년 2반';
    if (cid === 'class-3') return '관리자의 숲';
    return cid;
  };
  
  const dashboardPath = (profile?.role === 'teacher' || profile?.role === 'admin') ? '/teacher' : '/student';
  
  const [treeLevel, setTreeLevel] = useState(1);
  const [treeExp, setTreeExp] = useState(0);
  const [treeNextExp, setTreeNextExp] = useState(10);

  const [studentsPlants, setStudentsPlants] = useState<{ id: string, ownerId: string, name: string, growth: number, usedWater: number, usedSun: number, usedWind: number, isFlower: boolean, position: [number, number, number], seedBoughtAt?: string | null, seedLevel: number }[]>([]);

  // 심기 모드 관련 상태
  const [isPlantingMode, setIsPlantingMode] = useState(false);
  const [plantPreviewPos, setPlantPreviewPos] = useState<THREE.Vector3 | null>(null);
  const [plantPreviewValid, setPlantPreviewValid] = useState(false);

  // 식물 상호작용 상태
  const [hoveredPlantId, setHoveredPlantId] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedStudentLogs, setSelectedStudentLogs] = useState<any[]>([]);
  const [isLogsLoading, setIsLogsLoading] = useState(false);
  const [showAllLogs, setShowAllLogs] = useState(false);

  const [myInventory, setMyInventory] = useState<{ water: number; sun: number; wind: number; plantGrowth: number; plantPosX: number | null, plantPosZ: number | null }>({ water: 0, sun: 0, wind: 0, plantGrowth: 0, plantPosX: null, plantPosZ: null });

  // 애니메이션 이펙트 상태
  const [activeEffects, setActiveEffects] = useState<{ id: string, type: 'water' | 'sun' | 'wind', position: [number, number, number] }[]>([]);

  const handleUseItemInWorld = async (itemType: 'water' | 'sun' | 'wind') => {
    if (!profile) return;
    if (myInventory.plantGrowth === 0 || myInventory.plantPosX == null) {
      alert("씨앗을 먼저 심어주세요!");
      return;
    }
    const currentCount = myInventory[itemType];
    if (currentCount <= 0) {
      alert("아이템이 부족합니다! 내 상점에서 먼저 구매해주세요.");
      return;
    }

    // 애니메이션 이펙트 추가 (3초 뒤 자동 제거)
    const effectId = Date.now().toString() + Math.random().toString();
    const me = studentsPlants.find(p => p.id === profile.id);
    const plantPos = me ? me.position : [myInventory.plantPosX, 0, myInventory.plantPosZ || 0];
    
    setActiveEffects(prev => [...prev, { id: effectId, type: itemType, position: plantPos as [number, number, number] }]);
    setTimeout(() => {
      setActiveEffects(prev => prev.filter(e => e.id !== effectId));
    }, 3000);

    const { data: updatedUser, error } = await supabase.rpc('use_plant_item', { p_item: itemType });

    if (error || !updatedUser) {
      alert("아이템 사용 중 오류가 발생했습니다: " + (error?.message || '서버 응답이 없습니다.'));
      return;
    }

    // DB가 확정한 값을 사용한다. 3D 모델은 camelCase 필드를 읽으므로
    // 서버의 snake_case 결과를 여기서 명확히 변환한다.
    setMyInventory({
      water: updatedUser.item_water,
      sun: updatedUser.item_sun,
      wind: updatedUser.item_wind,
      plantGrowth: updatedUser.plant_growth,
      plantPosX: updatedUser.plant_position_x,
      plantPosZ: updatedUser.plant_position_z,
    });
    setStudentsPlants(prev => prev.map(p => p.id === profile.id ? {
      ...p,
      growth: updatedUser.plant_growth,
      usedWater: updatedUser.used_water,
      usedSun: updatedUser.used_sun,
      usedWind: updatedUser.used_wind,
      isFlower: updatedUser.used_water + updatedUser.used_sun + updatedUser.used_wind >= p.seedLevel + 1,
    } : p));

    if (profile.student_number && profile.group_code) {
      const { data: { session } } = await supabase.auth.getSession();
      fetch('/api/dividend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify({
          tree_exp: updatedUser.tree_exp
        })
      }).catch(() => undefined);
    }
  };

  React.useEffect(() => {
    if (!selectedStudentId) {
      setSelectedStudentLogs([]);
      return;
    }
    const fetchLogs = async () => {
      setIsLogsLoading(true);
      const student = studentsPlants.find(p => p.id === selectedStudentId);
      if (!student) return;
      let q = supabase.from('reading_logs').select('*').eq('user_id', student.ownerId).order('created_at', { ascending: false });
      
      if (!showAllLogs && student && student.seedBoughtAt) {
        q = q.gte('created_at', student.seedBoughtAt);
      }
      
      const { data } = await q;
      setSelectedStudentLogs(data || []);
      setIsLogsLoading(false);
    };
    fetchLogs();
  }, [selectedStudentId, showAllLogs, studentsPlants]);

  React.useEffect(() => {
    const fetchPlants = async () => {
      let userQuery = supabase.from('users').select('id, name, plant_growth, class_id, plant_position_x, plant_position_z, item_water, item_sun, item_wind, used_water, used_sun, used_wind, seed_level, seed_bought_at, tree_exp');
      if (classId) {
        userQuery = userQuery.eq('class_id', classId);
      }
      let { data: usersData } = await userQuery;

      if (profile?.id) {
        const { data: meData } = await supabase.from('users').select('id, name, plant_growth, class_id, plant_position_x, plant_position_z, item_water, item_sun, item_wind, used_water, used_sun, used_wind, seed_level, seed_bought_at, tree_exp').eq('id', profile.id).single();
        if (meData) {
          // meData를 가져오자마자 무조건 내 인벤토리를 업데이트!
          setMyInventory({ 
            water: meData.item_water || 0, 
            sun: meData.item_sun || 0, 
            wind: meData.item_wind || 0,
            plantGrowth: meData.plant_growth || 0,
            plantPosX: meData.plant_position_x,
            plantPosZ: meData.plant_position_z
          });

          if (!usersData) usersData = [];
          const existingIndex = usersData.findIndex(u => u.id === meData.id);
          if (meData.class_id === classId || !classId) {
            if (existingIndex !== -1) {
              usersData[existingIndex] = meData;
            } else {
              usersData.push(meData);
            }
          } else if (existingIndex !== -1) {
             usersData.splice(existingIndex, 1);
          }
        }
      }

      // 2. Fetch all reading logs
      const { data: logsData } = await supabase.from('reading_logs').select('user_id, category');
      
      if (usersData) {
        const validLogs = logsData || [];

        // filter out users without logs or growth
        const activeUsers = usersData.filter(user => 
          (user.plant_growth && user.plant_growth > 0) || 
          validLogs.some(log => log.user_id === user.id)
        );

        // Tree Exp Calculation
        let totalTreeExp = 0;
        usersData.forEach(u => {
          if (u.class_id === classId) {
            totalTreeExp += (u.tree_exp || 0);
          }
        });
        
        let calcLevel = 1;
        let expForNext = 10;
        let currentExp = totalTreeExp;
        while (currentExp >= expForNext) {
          currentExp -= expForNext;
          calcLevel++;
          expForNext = calcLevel + 9;
        }
        setTreeLevel(calcLevel);
        setTreeExp(currentExp);
        setTreeNextExp(expForNext);

        const plants = activeUsers.map((user) => {
          const sLevel = user.seed_level || 1;
          const isFlower = (user.used_water + user.used_sun + user.used_wind) >= sLevel + 1;

          if (user.plant_position_x == null || user.plant_position_z == null) {
            return null; // 아직 심지 않음
          }
          
          return {
            id: user.id,
            ownerId: user.id,
            name: user.name,
            growth: user.plant_growth || 0,
            usedWater: user.used_water || 0,
            usedSun: user.used_sun || 0,
            usedWind: user.used_wind || 0,
            isFlower,
            position: [user.plant_position_x, 0, user.plant_position_z] as [number, number, number],
            seedBoughtAt: user.seed_bought_at,
            seedLevel: sLevel
          };
        }).filter(Boolean) as typeof studentsPlants;

        const { data: archivedData } = await supabase
          .from('user_plants')
          .select('id, user_id, owner_name, seed_level, plant_growth, used_water, used_sun, used_wind, plant_position_x, plant_position_z, seed_bought_at')
          .eq('class_id', classId || '');
        const archivedFlowers = (archivedData || []).map(plant => ({
          id: plant.id,
          ownerId: plant.user_id,
          name: plant.owner_name,
          growth: plant.plant_growth,
          usedWater: plant.used_water,
          usedSun: plant.used_sun,
          usedWind: plant.used_wind,
          isFlower: true,
          position: [plant.plant_position_x, 0, plant.plant_position_z] as [number, number, number],
          seedBoughtAt: plant.seed_bought_at,
          seedLevel: plant.seed_level,
        }));
        setStudentsPlants([...plants, ...archivedFlowers]);
      }
    };
    fetchPlants();
  }, [classId, profile?.id]);

  // 바닥(땅) 클릭 핸들러
  const handleGroundClick = (event: ThreeEvent<PointerEvent>) => {
    if (isPlantingMode) {
      const pt = event.point.clone();
      setPlantPreviewPos(pt);
      
      const distToTree = Math.sqrt(pt.x * pt.x + pt.z * pt.z);
      let isValid = distToTree >= 3.0; // 나무 반경 3.0 이내 불가
      
      if (isValid) {
        for (const p of studentsPlants) {
          const dx = pt.x - p.position[0];
          const dz = pt.z - p.position[2];
          if (Math.sqrt(dx * dx + dz * dz) < 1.5) {
            isValid = false;
            break;
          }
        }
      }
      setPlantPreviewValid(isValid);
      return;
    }

    if (controlMode === 'keyboard') return; // 키보드 모드일 때는 클릭 이동 무시
    setCharacterTarget(event.point.clone());
  };

  const handleConfirmPlant = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!plantPreviewPos || !profile?.id) return;
    
    const { data, error } = await supabase.rpc('plant_seed', { p_x: plantPreviewPos.x, p_z: plantPreviewPos.z, p_class_id: classId || null });

    if (error || !data) {
      alert("⚠️ 씨앗 심기에 실패했습니다! (DB 권한 부족: Supabase UPDATE 정책을 확인하세요)");
      setIsPlantingMode(false);
      setPlantPreviewPos(null);
      return;
    }
    
    setIsPlantingMode(false);
    setPlantPreviewPos(null);
    alert("씨앗을 심었습니다! 이제 물을 주고 식물을 키워보세요.");
    window.location.reload();
  };

  const handleDeletePlant = async (studentId: string) => {
    if (!window.confirm("이 식물을 삭제하시겠습니까?")) return;
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
      body: JSON.stringify({ action: 'resetPlant', studentId }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      alert(`식물 삭제 중 오류가 발생했습니다: ${data.error ?? '알 수 없는 오류'}`);
    } else {
      setStudentsPlants(prev => prev.filter(p => p.id !== studentId));
      setSelectedStudentId(null);
      alert("식물이 삭제되었습니다.");
    }
  };

  const grassData = React.useMemo(() => {
    const data: { position: [number, number, number], scaleY: number }[] = [];
    for (let i = 0; i < 50; i++) {
      // Deterministic decoration: it stays stable across renders and SSR.
      const unit = (seed: number) => {
        const value = Math.sin(seed * 12.9898) * 43758.5453;
        return value - Math.floor(value);
      };
      const angle = unit(i * 3 + 1) * Math.PI * 2;
      const radius = 5 + unit(i * 3 + 2) * 35;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const scaleY = 0.5 + unit(i * 3 + 3) * 1.5;
      
      data.push({ position: [x, scaleY / 2, z], scaleY });
    }
    return data;
  }, []);

  // 실제 씨앗 보유 여부 (상태에서 즉시 도출)
  const actualHasSeed = myInventory.plantGrowth > 0 && myInventory.plantPosX == null;

  return (
    <div className="relative w-full h-screen bg-sky-200 overflow-hidden">
      {/* 3D 캔버스 영역 (해상도 타협 및 자동 성능 조절로 초저사양 기기 완벽 최적화) */}
      <Canvas 
        shadows 
        dpr={[0.8, 1]} 
        performance={{ min: 0.5 }} 
        camera={{ position: [0, 8, 18], fov: 45 }}
      >
        <Suspense fallback={<CanvasLoader />}>
          <ambientLight intensity={0.6} />
          <directionalLight 
            castShadow 
            position={[10, 20, 10]} 
            intensity={1.2} 
            shadow-mapSize={[512, 512]} 
          />
          
          <color attach="background" args={['#87CEEB']} />
          <SimpleCloud position={[-15, 20, -25]} scale={2} />
          <SimpleCloud position={[20, 25, -30]} scale={3} />

          {/* 에셋 렌더링 */}
          <CharacterModel targetPosition={characterTarget} controlMode={controlMode} />
          
          {studentsPlants.map(plant => (
            <group 
              key={plant.id} 
              position={plant.position}
              onPointerOver={(e) => { e.stopPropagation(); setHoveredPlantId(plant.id); document.body.style.cursor = 'pointer'; }}
              onPointerOut={(e) => { e.stopPropagation(); setHoveredPlantId(null); document.body.style.cursor = 'auto'; }}
              onClick={(e) => { 
                e.stopPropagation(); 
                if (!isPlantingMode) setSelectedStudentId(plant.id); 
              }}
            >
              <PlantModel 
                growth={plant.growth} 
                isFlower={plant.isFlower} 
                usedWater={plant.usedWater}
                usedSun={plant.usedSun}
                usedWind={plant.usedWind}
                seedLevel={plant.seedLevel}
              />
              {!isPlantingMode && hoveredPlantId === plant.id && (
                <Html position={[0, 2, 0]} center zIndexRange={[100, 0]}>
                  <div className="px-3 py-2 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border-2 border-green-300 text-sm font-bold text-green-800 whitespace-nowrap cursor-pointer animate-fade-in transition-transform hover:scale-110">
                    🌱 {plant.name}의 식물 구경하기
                  </div>
                </Html>
              )}
            </group>
          ))}
          
          {/* 애니메이션 렌더링 */}
          {activeEffects.map(effect => (
            <ItemEffectModel key={effect.id} position={effect.position} type={effect.type} />
          ))}
          
          {isPlantingMode && plantPreviewPos && (
            <group position={plantPreviewPos}>
               <mesh position={[0, 0.1, 0]}>
                   <sphereGeometry args={[0.2, 16, 16]} />
                   <meshStandardMaterial color={plantPreviewValid ? "#4ade80" : "#ef4444"} transparent opacity={0.7} />
               </mesh>
               <Html position={[0, 1, 0]} center zIndexRange={[100, 0]}>
                  <div className="flex flex-col items-center gap-2">
                    {!plantPreviewValid ? (
                      <span className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm font-bold shadow whitespace-nowrap">
                        여기에 심을 수 없습니다 (너무 가깝습니다)
                      </span>
                    ) : (
                      <button 
                        onPointerDown={handleConfirmPlant}
                        className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-bold shadow-lg whitespace-nowrap animate-bounce pointer-events-auto"
                      >
                        씨앗 심기 🌱
                      </button>
                    )}
                  </div>
               </Html>
            </group>
          )}
          
          <Instances limit={50} castShadow={false} receiveShadow={false}>
            <boxGeometry args={[0.2, 1, 0.2]} />
            <meshStandardMaterial color="#66b032" />
            {grassData.map((data, i) => (
              <Instance key={i} position={data.position} scale={[1, data.scaleY, 1]} />
            ))}
          </Instances>

          <TreeModel position={[0, 0, 0]} level={treeLevel} dashboardPath={dashboardPath} />

          <mesh 
            rotation={[-Math.PI / 2, 0, 0]} 
            position={[0, 0, 0]} 
            receiveShadow 
            onClick={handleGroundClick}
          >
            <planeGeometry args={[100, 100]} />
            <meshStandardMaterial color="#a8d94e" roughness={0.8} />
          </mesh>

          <ContactShadows position={[0, -0.05, 0]} opacity={0.5} scale={40} blur={1} far={10} resolution={128} />
          
          {/* 키보드 모드일 때는 마우스 회전(OrbitControls)을 끄고 카메라를 고정시킵니다 */}
          <OrbitControls 
            makeDefault 
            enabled={controlMode === 'click'}
            minPolarAngle={0} 
            maxPolarAngle={Math.PI / 2} 
            minDistance={5} 
            maxDistance={150} 
          />
        </Suspense>
      </Canvas>

      {/* 게임 월드 위에 띄워질 UI 오버레이 (2D HTML) */}
      <div className="absolute top-6 left-6 z-10 flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <Link 
            to="/map" 
            className="px-6 py-2 bg-white/90 backdrop-blur-sm text-gray-800 font-bold rounded-full shadow-md hover:bg-white transition-all flex items-center"
          >
            ← 숲(월드맵)으로
          </Link>
          <div className="flex flex-col gap-1">
            <div className="px-6 py-2 bg-green-600 text-white font-black rounded-full shadow-lg border-2 border-green-400 text-lg">
              {formatClassId(classId)}의 독서 나무 (Lv.{treeLevel})
            </div>
            <div className="px-4 py-1 bg-white/90 text-green-800 font-bold rounded-full shadow border border-green-200 text-sm text-center">
              EXP: {treeExp} / {treeNextExp}
            </div>
          </div>
        </div>
        
        {/* 조작 모드 전환 버튼 */}
        <button
          onClick={() => setControlMode(prev => prev === 'click' ? 'keyboard' : 'click')}
          className="px-6 py-3 w-fit bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-2xl shadow-lg border-2 border-indigo-300 transition-all flex items-center gap-2"
        >
          {controlMode === 'click' ? '🎮 1인칭(키보드) 모드로 변경' : '🖱️ 3인칭(마우스) 모드로 변경'}
        </button>

        {/* 씨앗 심기 수동 트리거 */}
        {actualHasSeed && !isPlantingMode && (
          <button
            onClick={() => setIsPlantingMode(true)}
            className="px-6 py-3 w-fit bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl shadow-lg border-2 border-emerald-300 transition-all flex items-center gap-2 mt-2 animate-bounce"
          >
            🌱 보유 씨앗 1개 (심기)
          </button>
        )}

        {/* 씨앗 심기 취소 버튼 */}
        {isPlantingMode && (
          <button
            onClick={() => { setIsPlantingMode(false); setPlantPreviewPos(null); }}
            className="px-6 py-3 w-fit bg-gray-500 hover:bg-gray-600 text-white font-bold rounded-2xl shadow-lg border-2 border-gray-300 transition-all flex items-center gap-2 mt-2"
          >
            ❌ 씨앗 심기 취소
          </button>
        )}

        {/* 내 인벤토리 표시 */}
        <div className="flex flex-col gap-2 bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-lg border-2 border-green-200 mt-2 w-fit">
          <h3 className="text-sm font-bold text-green-800">내 인벤토리</h3>
          <div className="flex gap-2">
            <div className="flex items-center gap-1 font-bold text-amber-600 bg-white/50 px-2 py-1 rounded-lg">
              <img src="/seed.png" alt="씨앗" className="w-6 h-6 object-contain drop-shadow-sm" /> 
              <span className="text-xs">{actualHasSeed ? '1개 (미심음)' : (myInventory.plantGrowth > 0 ? '이미 심음' : '0개')}</span>
            </div>
            <button 
              onClick={() => handleUseItemInWorld('water')}
              className="flex items-center gap-1 font-bold text-blue-600 hover:scale-110 transition-transform bg-white/50 px-2 py-1 rounded-lg shadow-sm border border-blue-100"
            >
              <img src="/water.png" alt="물" className="w-6 h-6 object-contain drop-shadow-sm" /> 
              <span>x {myInventory.water}</span>
            </button>
            <button 
              onClick={() => handleUseItemInWorld('sun')}
              className="flex items-center gap-1 font-bold text-red-600 hover:scale-110 transition-transform bg-white/50 px-2 py-1 rounded-lg shadow-sm border border-red-100"
            >
              <img src="/sun.png" alt="햇빛" className="w-6 h-6 object-contain drop-shadow-sm" /> 
              <span>x {myInventory.sun}</span>
            </button>
            <button 
              onClick={() => handleUseItemInWorld('wind')}
              className="flex items-center gap-1 font-bold text-teal-600 hover:scale-110 transition-transform bg-white/50 px-2 py-1 rounded-lg shadow-sm border border-teal-100"
            >
              <img src="/wind.png" alt="바람" className="w-6 h-6 object-contain drop-shadow-sm" /> 
              <span>x {myInventory.wind}</span>
            </button>
          </div>
          <p className="text-[10px] text-green-700 font-bold leading-tight mt-1">아이템을 클릭하여 내 식물을 바로 키울 수 있어요!</p>
        </div>
      </div>

      <div className="absolute top-6 right-6 z-10 flex gap-4">
        {profile?.role === 'teacher' && (
          <Link 
            to="/student" 
            className="px-6 py-2 bg-green-500 text-white font-bold rounded-full shadow-md hover:bg-green-600 transition-all flex items-center gap-2"
          >
            🌱 내 상점 가기
          </Link>
        )}
        <Link 
          to={dashboardPath} 
          className="px-6 py-2 bg-blue-500 text-white font-bold rounded-full shadow-md hover:bg-blue-600 transition-all"
        >
          {profile?.role === 'teacher' || profile?.role === 'admin' ? '교사 대시보드' : '내 대시보드'}
        </Link>
        <Link 
          to="/write" 
          className="px-6 py-2 bg-amber-500 text-white font-bold rounded-full shadow-md hover:bg-amber-600 transition-all flex items-center gap-2"
        >
          <span>✍️</span> 독서록 쓰기
        </Link>
      </div>

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 bg-black/60 text-white px-8 py-3 rounded-full backdrop-blur-sm pointer-events-none text-base font-medium shadow-lg whitespace-nowrap">
        {isPlantingMode 
          ? '🌱 심기 모드: 마우스로 땅을 클릭하여 씨앗을 심을 위치를 정해주세요.' 
          : controlMode === 'click' 
            ? '👆 마우스로 땅을 클릭하여 이동하고, 친구의 식물을 클릭하여 독서록을 구경해보세요!'
            : '⌨️ W,A,S,D(이동) / Shift(달리기) / Space(점프) - 마우스로 식물 클릭 가능'}
      </div>

      {/* 독서록 구경하기 모달 */}
      {selectedStudentId && (
        <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl max-h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-fade-in-up">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-green-50">
              <h2 className="text-2xl font-bold text-green-800 flex items-center gap-2">
                <span>🌱</span> 
                {studentsPlants.find(p => p.id === selectedStudentId)?.name} 친구의 독서 기록
              </h2>
              <div className="flex items-center gap-3">
                {profile?.role === 'admin' && (
                  <button 
                    onClick={() => handleDeletePlant(studentsPlants.find(p => p.id === selectedStudentId)?.ownerId || selectedStudentId)}
                    className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-bold hover:bg-red-200 shadow-sm"
                  >
                    🗑️ 식물 삭제
                  </button>
                )}
                <button 
                  onClick={() => setShowAllLogs(!showAllLogs)}
                  className="px-4 py-1.5 bg-white text-green-700 rounded-full text-sm font-bold border border-green-200 hover:bg-green-50 shadow-sm"
                >
                  {showAllLogs ? '🌱 이번 씨앗 기록만' : '📚 전체보기'}
                </button>
                <button 
                  onClick={() => setSelectedStudentId(null)}
                  className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors shadow-sm font-bold"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              {isLogsLoading ? (
                <div className="flex justify-center items-center h-full text-gray-500 font-medium">독서록을 불러오는 중...</div>
              ) : selectedStudentLogs.length === 0 ? (
                <div className="flex justify-center items-center h-full text-gray-500 italic">아직 작성한 독서록이 없어요.</div>
              ) : (
                <div className="space-y-6">
                  {selectedStudentLogs.map(log => (
                    <div key={log.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-xl font-bold text-gray-800">{log.book_title}</h3>
                        <span className="text-sm text-gray-500">{new Date(log.created_at).toLocaleDateString()}</span>
                      </div>
                      
                      {log.image_url && (
                        <img src={log.image_url} alt="책 이미지" className="w-full max-w-sm rounded-xl mb-4 shadow-sm border border-gray-100" />
                      )}
                      
                      {log.text_content && (
                        <div className="bg-gray-50 p-4 rounded-xl text-gray-700 whitespace-pre-wrap leading-relaxed border border-gray-100">
                          {log.text_content}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameWorld;
