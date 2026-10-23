import hospitalGraph from './hospitalGraph.json' with { type: 'json' };

const NODE_MAP = new Map(hospitalGraph.nodes.map((node) => [node.id, node]));

/**
 * Builds the bidirectional adjacency list from hospitalGraph.json.
 * When avoidStairs is true, filters out any edge where mode === 'stairs' or accessible === false.
 *
 * @param {boolean} avoidStairs
 * @returns {Map<string, Array<object>>}
 */
function buildAdjacencyMap(avoidStairs = true) {
  const adjacency = new Map();
  for (const node of hospitalGraph.nodes) {
    adjacency.set(node.id, []);
  }

  for (const edge of hospitalGraph.edges) {
    if (avoidStairs && (edge.mode === 'stairs' || edge.accessible === false)) {
      continue;
    }

    if (adjacency.has(edge.from)) {
      adjacency.get(edge.from).push({
        from: edge.from,
        to: edge.to,
        distanceMeters: edge.distanceMeters,
        durationSeconds: edge.durationSeconds,
        mode: edge.mode,
        accessible: edge.accessible,
        instruction_en: edge.direction_en,
        instruction_hi: edge.direction_hi
      });
    }

    if (!edge.oneWay && adjacency.has(edge.to)) {
      adjacency.get(edge.to).push({
        from: edge.to,
        to: edge.from,
        distanceMeters: edge.distanceMeters,
        durationSeconds: edge.durationSeconds,
        mode: edge.mode,
        accessible: edge.accessible,
        instruction_en: edge.reverse_direction_en || edge.direction_en,
        instruction_hi: edge.reverse_direction_hi || edge.direction_hi
      });
    }
  }

  return adjacency;
}

/**
 * Returns all canonical hospital nodes for dropdowns and validation.
 */
export function getAllHospitalNodes() {
  return hospitalGraph.nodes;
}

/**
 * Computes the shortest accessible route between two hospital nodes using Dijkstra's algorithm.
 * Never fabricates steps if a node is unknown or unreachable.
 *
 * @param {object} params
 * @param {string} params.fromNodeId - Starting node ID (default: 'registration_desk')
 * @param {string} params.toNodeId - Destination node ID
 * @param {boolean} [params.avoidStairs=true] - Whether to exclude stairs
 * @returns {object} Route result
 */
export function findAccessibleRoute({
  fromNodeId = 'registration_desk',
  toNodeId,
  avoidStairs = true
}) {
  const originNode = NODE_MAP.get(fromNodeId);
  const destinationNode = NODE_MAP.get(toNodeId);

  if (!originNode || !destinationNode) {
    return {
      found: false,
      reason: 'NODE_NOT_FOUND',
      fromNode: originNode || null,
      toNode: destinationNode || null,
      avoidStairs: Boolean(avoidStairs),
      totalDistanceMeters: 0,
      estimatedWalkSeconds: 0,
      floorsTraversed: [],
      steps: [],
      fallbackMessage_en:
        'Destination room could not be found on the map. Please ask Counter 1–3 (Ground Floor Registration & Help Desk).',
      fallbackMessage_hi:
        'मानचित्र पर यह कक्ष नहीं मिला। कृपया भूतल पर काउंटर 1–3 (पंजीकरण और सहायता केंद्र) से संपर्क करें।'
    };
  }

  if (fromNodeId === toNodeId) {
    return {
      found: true,
      reason: 'SAME_NODE',
      fromNode: originNode,
      toNode: destinationNode,
      avoidStairs: Boolean(avoidStairs),
      totalDistanceMeters: 0,
      estimatedWalkSeconds: 0,
      floorsTraversed: [originNode.floor],
      steps: [
        {
          stepNumber: 1,
          fromNodeId: originNode.id,
          toNodeId: destinationNode.id,
          floor: originNode.floor,
          mode: 'corridor',
          distanceMeters: 0,
          durationSeconds: 0,
          instruction_en: `You are already at ${originNode.name_en} (${originNode.landmark_en}).`,
          instruction_hi: `आप पहले से ही ${originNode.name_hi} (${originNode.landmark_hi}) पर हैं।`,
          landmark_en: originNode.landmark_en,
          landmark_hi: originNode.landmark_hi
        }
      ]
    };
  }

  const adjacency = buildAdjacencyMap(Boolean(avoidStairs));
  const distances = new Map();
  const previousEdge = new Map();
  const visited = new Set();

  for (const node of hospitalGraph.nodes) {
    distances.set(node.id, Infinity);
  }
  distances.set(fromNodeId, 0);

  while (visited.size < hospitalGraph.nodes.length) {
    let currentId = null;
    let smallestDist = Infinity;

    for (const [nodeId, dist] of distances.entries()) {
      if (!visited.has(nodeId) && dist < smallestDist) {
        smallestDist = dist;
        currentId = nodeId;
      }
    }

    if (currentId === null || currentId === toNodeId) {
      break;
    }

    visited.add(currentId);
    const neighbors = adjacency.get(currentId) || [];

    for (const edge of neighbors) {
      if (visited.has(edge.to)) {
        continue;
      }
      const candidateCost = smallestDist + edge.durationSeconds;
      if (candidateCost < distances.get(edge.to)) {
        distances.set(edge.to, candidateCost);
        previousEdge.set(edge.to, edge);
      }
    }
  }

  if (!previousEdge.has(toNodeId)) {
    return {
      found: false,
      reason: 'NO_ACCESSIBLE_ROUTE',
      fromNode: originNode,
      toNode: destinationNode,
      avoidStairs: Boolean(avoidStairs),
      totalDistanceMeters: 0,
      estimatedWalkSeconds: 0,
      floorsTraversed: [],
      steps: [],
      fallbackMessage_en:
        'No direct barrier-free route is currently available. Please ask Counter 1–3 (Registration & Help Desk) for personal assistance.',
      fallbackMessage_hi:
        'इस समय कोई सीधा सुगम मार्ग उपलब्ध नहीं है। कृपया सहायता के लिए काउंटर 1–3 (पंजीकरण और सहायता केंद्र) से संपर्क करें।'
    };
  }

  const reconstructedEdges = [];
  let cursor = toNodeId;
  while (cursor !== fromNodeId) {
    const edge = previousEdge.get(cursor);
    reconstructedEdges.unshift(edge);
    cursor = edge.from;
  }

  const floorsSet = new Set([originNode.floor]);
  let totalDistanceMeters = 0;
  let estimatedWalkSeconds = 0;

  const steps = reconstructedEdges.map((edge, idx) => {
    const targetNode = NODE_MAP.get(edge.to);
    floorsSet.add(targetNode.floor);
    totalDistanceMeters += edge.distanceMeters;
    estimatedWalkSeconds += edge.durationSeconds;

    return {
      stepNumber: idx + 1,
      fromNodeId: edge.from,
      toNodeId: edge.to,
      fromFloor: NODE_MAP.get(edge.from).floor,
      toFloor: targetNode.floor,
      floor: targetNode.floor,
      mode: edge.mode,
      accessible: edge.accessible,
      distanceMeters: edge.distanceMeters,
      durationSeconds: edge.durationSeconds,
      instruction_en: edge.instruction_en,
      instruction_hi: edge.instruction_hi,
      landmark_en: targetNode.landmark_en,
      landmark_hi: targetNode.landmark_hi
    };
  });

  return {
    found: true,
    reason: 'OK',
    fromNode: originNode,
    toNode: destinationNode,
    avoidStairs: Boolean(avoidStairs),
    totalDistanceMeters,
    estimatedWalkSeconds,
    floorsTraversed: Array.from(floorsSet),
    steps
  };
}
