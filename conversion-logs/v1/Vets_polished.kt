// 2025-07-22T08:42:46.686Z (logged at)

package org.springframework.samples.petclinic.vet

import jakarta.xml.bind.annotation.XmlElement
import jakarta.xml.bind.annotation.XmlRootElement

@XmlRootElement
data class Vets(
    @field:XmlElement
    var vetList: MutableList<Vet> = mutableListOf<Vet>()
)
