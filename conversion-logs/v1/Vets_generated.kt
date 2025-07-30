// 2025-07-22T08:42:33.797Z (logged at)

package org.springframework.samples.petclinic.vet

import java.util.ArrayList
import java.util.List
import jakarta.xml.bind.annotation.XmlElement
import jakarta.xml.bind.annotation.XmlRootElement

@XmlRootElement
data class Vets(
    @field:XmlElement
    var vets: List<Vet> = ArrayList()
)